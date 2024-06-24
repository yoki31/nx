import { TasksRunner, TaskStatus } from './tasks-runner';
import { join } from 'path';
import { workspaceRoot } from '../utils/workspace-root';
import { NxArgs } from '../utils/command-line-utils';
import { isRelativePath } from '../utils/fileutils';
import { output } from '../utils/output';
import { shouldStreamOutput } from './utils';
import { CompositeLifeCycle, LifeCycle } from './life-cycle';
import { StaticRunManyTerminalOutputLifeCycle } from './life-cycles/static-run-many-terminal-output-life-cycle';
import { StaticRunOneTerminalOutputLifeCycle } from './life-cycles/static-run-one-terminal-output-life-cycle';
import { TaskTimingsLifeCycle } from './life-cycles/task-timings-life-cycle';
import { createRunManyDynamicOutputRenderer } from './life-cycles/dynamic-run-many-terminal-output-life-cycle';
import { TaskProfilingLifeCycle } from './life-cycles/task-profiling-life-cycle';
import { isCI } from '../utils/is-ci';
import { createRunOneDynamicOutputRenderer } from './life-cycles/dynamic-run-one-terminal-output-life-cycle';
import { ProjectGraph, ProjectGraphProjectNode } from '../config/project-graph';
import {
  NxJsonConfiguration,
  readNxJson,
  TargetDefaults,
  TargetDependencies,
} from '../config/nx-json';
import { Task, TaskGraph } from '../config/task-graph';
import { createTaskGraph } from './create-task-graph';
import { findCycle, makeAcyclic } from './task-graph-utils';
import { TargetDependencyConfig } from '../config/workspace-json-project-json';
import { handleErrors } from '../utils/params';
import { hashTasksThatDoNotDependOnOutputsOfOtherTasks } from '../hasher/hash-task';
import { daemonClient } from '../daemon/client/client';
import { StoreRunInformationLifeCycle } from './life-cycles/store-run-information-life-cycle';
import { createTaskHasher } from '../hasher/create-task-hasher';
import { TaskHistoryLifeCycle } from './life-cycles/task-history-life-cycle';
import { isNxCloudUsed } from '../utils/nx-cloud-utils';

async function getTerminalOutputLifeCycle(
  initiatingProject: string,
  projectNames: string[],
  tasks: Task[],
  nxArgs: NxArgs,
  nxJson: NxJsonConfiguration,
  overrides: Record<string, unknown>
): Promise<{ lifeCycle: LifeCycle; renderIsDone: Promise<void> }> {
  const { runnerOptions } = getRunner(nxArgs, nxJson);
  const isRunOne = initiatingProject != null;
  const useDynamicOutput = shouldUseDynamicLifeCycle(
    tasks,
    runnerOptions,
    nxArgs.outputStyle
  );

  const overridesWithoutHidden = { ...overrides };
  delete overridesWithoutHidden['__overrides_unparsed__'];

  if (isRunOne) {
    if (useDynamicOutput) {
      return await createRunOneDynamicOutputRenderer({
        initiatingProject,
        tasks,
        args: nxArgs,
        overrides: overridesWithoutHidden,
      });
    }
    return {
      lifeCycle: new StaticRunOneTerminalOutputLifeCycle(
        initiatingProject,
        projectNames,
        tasks,
        nxArgs
      ),
      renderIsDone: Promise.resolve(),
    };
  } else {
    if (useDynamicOutput) {
      return await createRunManyDynamicOutputRenderer({
        projectNames,
        tasks,
        args: nxArgs,
        overrides: overridesWithoutHidden,
      });
    } else {
      return {
        lifeCycle: new StaticRunManyTerminalOutputLifeCycle(
          projectNames,
          tasks,
          nxArgs,
          overridesWithoutHidden
        ),
        renderIsDone: Promise.resolve(),
      };
    }
  }
}

function createTaskGraphAndValidateCycles(
  projectGraph: ProjectGraph,
  extraTargetDependencies: TargetDependencies,
  projectNames: string[],
  nxArgs: NxArgs,
  overrides: any,
  extraOptions: {
    excludeTaskDependencies: boolean;
    loadDotEnvFiles: boolean;
  }
) {
  const taskGraph = createTaskGraph(
    projectGraph,
    extraTargetDependencies,
    projectNames,
    nxArgs.targets,
    nxArgs.configuration,
    overrides,
    extraOptions.excludeTaskDependencies
  );

  const cycle = findCycle(taskGraph);
  if (cycle) {
    if (process.env.NX_IGNORE_CYCLES === 'true' || nxArgs.nxIgnoreCycles) {
      output.warn({
        title: `The task graph has a circular dependency`,
        bodyLines: [`${cycle.join(' --> ')}`],
      });
      makeAcyclic(taskGraph);
    } else {
      output.error({
        title: `Could not execute command because the task graph has a circular dependency`,
        bodyLines: [`${cycle.join(' --> ')}`],
      });
      process.exit(1);
    }
  }

  return taskGraph;
}

export async function runCommand(
  projectsToRun: ProjectGraphProjectNode[],
  projectGraph: ProjectGraph,
  { nxJson }: { nxJson: NxJsonConfiguration },
  nxArgs: NxArgs,
  overrides: any,
  initiatingProject: string | null,
  extraTargetDependencies: Record<string, (TargetDependencyConfig | string)[]>,
  extraOptions: { excludeTaskDependencies: boolean; loadDotEnvFiles: boolean }
): Promise<NodeJS.Process['exitCode']> {
  const status = await handleErrors(
    process.env.NX_VERBOSE_LOGGING === 'true',
    async () => {
      const projectNames = projectsToRun.map((t) => t.name);

      const taskGraph = createTaskGraphAndValidateCycles(
        projectGraph,
        extraTargetDependencies ?? {},
        projectNames,
        nxArgs,
        overrides,
        extraOptions
      );
      const tasks = Object.values(taskGraph.tasks);

      const { lifeCycle, renderIsDone } = await getTerminalOutputLifeCycle(
        initiatingProject,
        projectNames,
        tasks,
        nxArgs,
        nxJson,
        overrides
      );

      const status = await invokeTasksRunner({
        tasks,
        projectGraph,
        taskGraph,
        lifeCycle,
        nxJson,
        nxArgs,
        loadDotEnvFiles: extraOptions.loadDotEnvFiles,
        initiatingProject,
      });

      await renderIsDone;

      return status;
    }
  );

  return status;
}

function setEnvVarsBasedOnArgs(nxArgs: NxArgs, loadDotEnvFiles: boolean) {
  if (
    nxArgs.outputStyle == 'stream' ||
    process.env.NX_BATCH_MODE === 'true' ||
    nxArgs.batch
  ) {
    process.env.NX_STREAM_OUTPUT = 'true';
    process.env.NX_PREFIX_OUTPUT = 'true';
  }
  if (nxArgs.outputStyle == 'stream-without-prefixes') {
    process.env.NX_STREAM_OUTPUT = 'true';
  }
  if (loadDotEnvFiles) {
    process.env.NX_LOAD_DOT_ENV_FILES = 'true';
  }
}

export async function invokeTasksRunner({
  tasks,
  projectGraph,
  taskGraph,
  lifeCycle,
  nxJson,
  nxArgs,
  loadDotEnvFiles,
  initiatingProject,
}: {
  tasks: Task[];
  projectGraph: ProjectGraph;
  taskGraph: TaskGraph;
  lifeCycle: LifeCycle;
  nxJson: NxJsonConfiguration;
  nxArgs: NxArgs;
  loadDotEnvFiles: boolean;
  initiatingProject: string | null;
}) {
  setEnvVarsBasedOnArgs(nxArgs, loadDotEnvFiles);

  const { tasksRunner, runnerOptions } = getRunner(nxArgs, nxJson);

  let hasher = createTaskHasher(projectGraph, nxJson, runnerOptions);

  // this is used for two reasons: to fetch all remote cache hits AND
  // to submit everything that is known in advance to Nx Cloud to run in
  // a distributed fashion

  await hashTasksThatDoNotDependOnOutputsOfOtherTasks(
    hasher,
    projectGraph,
    taskGraph,
    nxJson
  );

  const promiseOrObservable = tasksRunner(
    tasks,
    {
      ...runnerOptions,
      lifeCycle: new CompositeLifeCycle(constructLifeCycles(lifeCycle)),
    },
    {
      initiatingProject:
        nxArgs.outputStyle === 'compact' ? null : initiatingProject,
      projectGraph,
      nxJson,
      nxArgs,
      taskGraph,
      hasher: {
        hashTask(task: Task, taskGraph_?: TaskGraph, env?: NodeJS.ProcessEnv) {
          if (!taskGraph_) {
            output.warn({
              title: `TaskGraph is now required as an argument to hashTask`,
              bodyLines: [
                `The TaskGraph object can be retrieved from the context`,
                'This will result in an error in Nx 20',
              ],
            });
            taskGraph_ = taskGraph;
          }
          if (!env) {
            output.warn({
              title: `The environment variables are now required as an argument to hashTask`,
              bodyLines: [
                `Please pass the environment variables used when running the task`,
                'This will result in an error in Nx 20',
              ],
            });
            env = process.env;
          }
          return hasher.hashTask(task, taskGraph_, env);
        },
        hashTasks(
          task: Task[],
          taskGraph_?: TaskGraph,
          env?: NodeJS.ProcessEnv
        ) {
          if (!taskGraph_) {
            output.warn({
              title: `TaskGraph is now required as an argument to hashTasks`,
              bodyLines: [
                `The TaskGraph object can be retrieved from the context`,
                'This will result in an error in Nx 20',
              ],
            });
            taskGraph_ = taskGraph;
          }
          if (!env) {
            output.warn({
              title: `The environment variables are now required as an argument to hashTasks`,
              bodyLines: [
                `Please pass the environment variables used when running the tasks`,
                'This will result in an error in Nx 20',
              ],
            });
            env = process.env;
          }

          return hasher.hashTasks(task, taskGraph_, env);
        },
      },
      daemon: daemonClient,
    }
  );
  let anyFailures;
  if ((promiseOrObservable as any).subscribe) {
    anyFailures = await anyFailuresInObservable(promiseOrObservable);
  } else {
    // simply await the promise
    anyFailures = await anyFailuresInPromise(promiseOrObservable as any);
  }
  return anyFailures ? 1 : 0;
}

function constructLifeCycles(lifeCycle: LifeCycle) {
  const lifeCycles = [] as LifeCycle[];
  lifeCycles.push(new StoreRunInformationLifeCycle());
  lifeCycles.push(lifeCycle);
  if (process.env.NX_PERF_LOGGING === 'true') {
    lifeCycles.push(new TaskTimingsLifeCycle());
  }
  if (process.env.NX_PROFILE) {
    lifeCycles.push(new TaskProfilingLifeCycle(process.env.NX_PROFILE));
  }
  if (!isNxCloudUsed(readNxJson())) {
    lifeCycles.push(new TaskHistoryLifeCycle());
  }
  return lifeCycles;
}

function mergeTargetDependencies(
  defaults: TargetDefaults | undefined | null,
  deps: TargetDependencies
): TargetDependencies {
  const res = {};
  Object.keys(defaults ?? {}).forEach((k) => {
    res[k] = defaults[k].dependsOn;
  });
  if (deps) {
    Object.keys(deps).forEach((k) => {
      if (res[k]) {
        res[k] = [...res[k], deps[k]];
      } else {
        res[k] = deps[k];
      }
    });

    return res;
  }
}

async function anyFailuresInPromise(
  promise: Promise<{ [id: string]: TaskStatus }>
) {
  return Object.values(await promise).some(
    (v) => v === 'failure' || v === 'skipped'
  );
}

async function anyFailuresInObservable(obs: any) {
  return await new Promise((res) => {
    let anyFailures = false;
    obs.subscribe(
      (t) => {
        if (!t.success) {
          anyFailures = true;
        }
      },
      (error) => {
        output.error({
          title: 'Unhandled error in task executor',
        });
        console.error(error);
        res(true);
      },
      () => {
        res(anyFailures);
      }
    );
  });
}

function shouldUseDynamicLifeCycle(
  tasks: Task[],
  options: any,
  outputStyle: string
) {
  if (
    process.env.NX_BATCH_MODE === 'true' ||
    process.env.NX_VERBOSE_LOGGING === 'true' ||
    process.env.NX_TASKS_RUNNER_DYNAMIC_OUTPUT === 'false'
  ) {
    return false;
  }
  if (!process.stdout.isTTY) return false;
  if (isCI()) return false;
  if (outputStyle === 'static' || outputStyle === 'stream') return false;

  return !tasks.find((t) => shouldStreamOutput(t, null));
}

function loadTasksRunner(modulePath: string) {
  try {
    const maybeTasksRunner = require(modulePath) as
      | TasksRunner
      | { default: TasksRunner };
    // to support both babel and ts formats
    return 'default' in maybeTasksRunner
      ? maybeTasksRunner.default
      : maybeTasksRunner;
  } catch (e) {
    if (
      e.code === 'MODULE_NOT_FOUND' &&
      (modulePath === 'nx-cloud' || modulePath === '@nrwl/nx-cloud')
    ) {
      return require('../nx-cloud/nx-cloud-tasks-runner-shell')
        .nxCloudTasksRunnerShell;
    }
    throw e;
  }
}

export function getRunner(
  nxArgs: NxArgs,
  nxJson: NxJsonConfiguration
): {
  tasksRunner: TasksRunner;
  runnerOptions: any;
} {
  let runner = nxArgs.runner;
  runner = runner || 'default';

  if (runner !== 'default' && !nxJson.tasksRunnerOptions?.[runner]) {
    throw new Error(`Could not find runner configuration for ${runner}`);
  }

  const modulePath: string = getTasksRunnerPath(runner, nxJson);

  try {
    const tasksRunner = loadTasksRunner(modulePath);

    return {
      tasksRunner,
      runnerOptions: getRunnerOptions(
        runner,
        nxJson,
        nxArgs,
        modulePath === 'nx-cloud'
      ),
    };
  } catch {
    throw new Error(`Could not find runner configuration for ${runner}`);
  }
}

function getTasksRunnerPath(
  runner: string,
  nxJson: NxJsonConfiguration<string[] | '*'>
) {
  let modulePath: string = nxJson.tasksRunnerOptions?.[runner]?.runner;

  if (modulePath) {
    if (isRelativePath(modulePath)) {
      return join(workspaceRoot, modulePath);
    }
    return modulePath;
  }

  const isCloudRunner =
    // No tasksRunnerOptions for given --runner
    nxJson.nxCloudAccessToken ||
    // No runner prop in tasks runner options, check if access token is set.
    nxJson.tasksRunnerOptions?.[runner]?.options?.accessToken ||
    // Cloud access token specified in env var.
    process.env.NX_CLOUD_ACCESS_TOKEN;

  return isCloudRunner ? 'nx-cloud' : require.resolve('./default-tasks-runner');
}

export function getRunnerOptions(
  runner: string,
  nxJson: NxJsonConfiguration<string[] | '*'>,
  nxArgs: NxArgs,
  isCloudDefault: boolean
): any {
  const defaultCacheableOperations = [];

  for (const key in nxJson.targetDefaults) {
    if (nxJson.targetDefaults[key].cache) {
      defaultCacheableOperations.push(key);
    }
  }

  const result = {
    ...nxJson.tasksRunnerOptions?.[runner]?.options,
    ...nxArgs,
  };

  // NOTE: we don't pull from env here because the cloud package
  // supports it within nx-cloud's implementation. We could
  // normalize it here, and that may make more sense, but
  // leaving it as is for now.
  if (nxJson.nxCloudAccessToken && isCloudDefault) {
    result.accessToken ??= nxJson.nxCloudAccessToken;
  }

  if (nxJson.nxCloudUrl && isCloudDefault) {
    result.url ??= nxJson.nxCloudUrl;
  }

  if (nxJson.nxCloudEncryptionKey && isCloudDefault) {
    result.encryptionKey ??= nxJson.nxCloudEncryptionKey;
  }

  if (nxJson.parallel) {
    result.parallel ??= nxJson.parallel;
  }

  if (nxJson.cacheDirectory) {
    result.cacheDirectory ??= nxJson.cacheDirectory;
  }

  if (defaultCacheableOperations.length) {
    result.cacheableOperations ??= [];
    result.cacheableOperations = result.cacheableOperations.concat(
      defaultCacheableOperations
    );
  }

  if (nxJson.useDaemonProcess !== undefined) {
    result.useDaemonProcess ??= nxJson.useDaemonProcess;
  }

  return result;
}
