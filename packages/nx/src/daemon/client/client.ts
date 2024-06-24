import { workspaceRoot } from '../../utils/workspace-root';
import { ChildProcess, spawn } from 'child_process';
import { readFileSync, statSync } from 'fs';
import { FileHandle, open } from 'fs/promises';
import { ensureDirSync, ensureFileSync } from 'fs-extra';
import { connect } from 'net';
import { extname, join } from 'path';
import { performance } from 'perf_hooks';
import { output } from '../../utils/output';
import { getFullOsSocketPath, killSocketOrPath } from '../socket-utils';
import {
  DAEMON_DIR_FOR_CURRENT_WORKSPACE,
  DAEMON_OUTPUT_LOG_FILE,
  isDaemonDisabled,
  removeSocketDir,
} from '../tmp-dir';
import { FileData, ProjectGraph } from '../../config/project-graph';
import { isCI } from '../../utils/is-ci';
import { NxJsonConfiguration } from '../../config/nx-json';
import { readNxJson } from '../../config/configuration';
import { PromisedBasedQueue } from '../../utils/promised-based-queue';
import { hasNxJson } from '../../config/nx-json';
import { Message, DaemonSocketMessenger } from './daemon-socket-messenger';
import { safelyCleanUpExistingProcess } from '../cache';
import { Hash } from '../../hasher/task-hasher';
import { Task, TaskGraph } from '../../config/task-graph';
import { ConfigurationSourceMaps } from '../../project-graph/utils/project-configuration-utils';
import {
  DaemonProjectGraphError,
  ProjectGraphError,
} from '../../project-graph/error-types';
import { loadRootEnvFiles } from '../../utils/dotenv';
import { HandleGlobMessage } from '../message-types/glob';
import {
  GET_NX_WORKSPACE_FILES,
  HandleNxWorkspaceFilesMessage,
} from '../message-types/get-nx-workspace-files';
import {
  GET_CONTEXT_FILE_DATA,
  HandleContextFileDataMessage,
} from '../message-types/get-context-file-data';
import {
  GET_FILES_IN_DIRECTORY,
  HandleGetFilesInDirectoryMessage,
} from '../message-types/get-files-in-directory';
import { HASH_GLOB, HandleHashGlobMessage } from '../message-types/hash-glob';
import { NxWorkspaceFiles } from '../../native';
import { TaskRun } from '../../utils/task-history';
import {
  HandleGetTaskHistoryForHashesMessage,
  HandleWriteTaskRunsToHistoryMessage,
} from '../message-types/task-history';

const DAEMON_ENV_SETTINGS = {
  NX_PROJECT_GLOB_CACHE: 'false',
  NX_CACHE_PROJECTS_CONFIG: 'false',
};

export type UnregisterCallback = () => void;
export type ChangedFile = {
  path: string;
  type: 'create' | 'update' | 'delete';
};

enum DaemonStatus {
  CONNECTING,
  DISCONNECTED,
  CONNECTED,
}

export class DaemonClient {
  private readonly nxJson: NxJsonConfiguration | null;
  constructor() {
    try {
      this.nxJson = readNxJson();
    } catch (e) {
      this.nxJson = null;
    }
    this.reset();
  }

  private queue: PromisedBasedQueue;
  private socketMessenger: DaemonSocketMessenger;

  private currentMessage;
  private currentResolve;
  private currentReject;

  private _enabled: boolean | undefined;
  private _daemonStatus: DaemonStatus = DaemonStatus.DISCONNECTED;
  private _waitForDaemonReady: Promise<void> | null = null;
  private _daemonReady: () => void | null = null;
  private _out: FileHandle = null;
  private _err: FileHandle = null;

  enabled() {
    if (this._enabled === undefined) {
      // TODO(v19): Add migration to move it out of existing configs and remove the ?? here.
      const useDaemonProcessOption =
        this.nxJson?.useDaemonProcess ??
        this.nxJson?.tasksRunnerOptions?.['default']?.options?.useDaemonProcess;
      const env = process.env.NX_DAEMON;

      // env takes precedence
      // option=true,env=false => no daemon
      // option=false,env=undefined => no daemon
      // option=false,env=false => no daemon

      // option=undefined,env=undefined => daemon
      // option=true,env=true => daemon
      // option=false,env=true => daemon

      // CI=true,env=undefined => no daemon
      // CI=true,env=false => no daemon
      // CI=true,env=true => daemon
      if (
        (isCI() && env !== 'true') ||
        isDocker() ||
        isDaemonDisabled() ||
        nxJsonIsNotPresent() ||
        (useDaemonProcessOption === undefined && env === 'false') ||
        (useDaemonProcessOption === true && env === 'false') ||
        (useDaemonProcessOption === false && env === undefined) ||
        (useDaemonProcessOption === false && env === 'false')
      ) {
        this._enabled = false;
      } else {
        this._enabled = true;
      }
    }
    return this._enabled;
  }

  reset() {
    this.socketMessenger?.close();
    this.socketMessenger = null;
    this.queue = new PromisedBasedQueue();
    this.currentMessage = null;
    this.currentResolve = null;
    this.currentReject = null;
    this._enabled = undefined;

    this._out?.close();
    this._err?.close();
    this._out = null;
    this._err = null;

    this._daemonStatus = DaemonStatus.DISCONNECTED;
    this._waitForDaemonReady = new Promise<void>(
      (resolve) => (this._daemonReady = resolve)
    );
  }

  async requestShutdown(): Promise<void> {
    return this.sendToDaemonViaQueue({ type: 'REQUEST_SHUTDOWN' });
  }

  async getProjectGraphAndSourceMaps(): Promise<{
    projectGraph: ProjectGraph;
    sourceMaps: ConfigurationSourceMaps;
  }> {
    try {
      const response = await this.sendToDaemonViaQueue({
        type: 'REQUEST_PROJECT_GRAPH',
      });
      return {
        projectGraph: response.projectGraph,
        sourceMaps: response.sourceMaps,
      };
    } catch (e) {
      if (e.name === DaemonProjectGraphError.name) {
        throw ProjectGraphError.fromDaemonProjectGraphError(e);
      } else {
        throw e;
      }
    }
  }

  async getAllFileData(): Promise<FileData[]> {
    return await this.sendToDaemonViaQueue({ type: 'REQUEST_FILE_DATA' });
  }

  hashTasks(
    runnerOptions: any,
    tasks: Task[],
    taskGraph: TaskGraph,
    env: NodeJS.ProcessEnv
  ): Promise<Hash[]> {
    return this.sendToDaemonViaQueue({
      type: 'HASH_TASKS',
      runnerOptions,
      env,
      tasks,
      taskGraph,
    });
  }

  async registerFileWatcher(
    config: {
      watchProjects: string[] | 'all';
      includeGlobalWorkspaceFiles?: boolean;
      includeDependentProjects?: boolean;
      allowPartialGraph?: boolean;
    },
    callback: (
      error: Error | null | 'closed',
      data: {
        changedProjects: string[];
        changedFiles: ChangedFile[];
      } | null
    ) => void
  ): Promise<UnregisterCallback> {
    try {
      await this.getProjectGraphAndSourceMaps();
    } catch (e) {
      if (config.allowPartialGraph && e instanceof ProjectGraphError) {
        // we are fine with partial graph
      } else {
        throw e;
      }
    }
    let messenger: DaemonSocketMessenger | undefined;

    await this.queue.sendToQueue(() => {
      messenger = new DaemonSocketMessenger(
        connect(getFullOsSocketPath())
      ).listen(
        (message) => {
          try {
            const parsedMessage = JSON.parse(message);
            callback(null, parsedMessage);
          } catch (e) {
            callback(e, null);
          }
        },
        () => {
          callback('closed', null);
        },
        (err) => callback(err, null)
      );
      return messenger.sendMessage({ type: 'REGISTER_FILE_WATCHER', config });
    });

    return () => {
      messenger?.close();
    };
  }

  processInBackground(requirePath: string, data: any): Promise<any> {
    return this.sendToDaemonViaQueue({
      type: 'PROCESS_IN_BACKGROUND',
      requirePath,
      data,
    });
  }

  recordOutputsHash(outputs: string[], hash: string): Promise<any> {
    return this.sendToDaemonViaQueue({
      type: 'RECORD_OUTPUTS_HASH',
      data: {
        outputs,
        hash,
      },
    });
  }

  outputsHashesMatch(outputs: string[], hash: string): Promise<any> {
    return this.sendToDaemonViaQueue({
      type: 'OUTPUTS_HASHES_MATCH',
      data: {
        outputs,
        hash,
      },
    });
  }

  glob(globs: string[], exclude?: string[]): Promise<string[]> {
    const message: HandleGlobMessage = {
      type: 'GLOB',
      globs,
      exclude,
    };
    return this.sendToDaemonViaQueue(message);
  }

  getWorkspaceContextFileData(): Promise<FileData[]> {
    const message: HandleContextFileDataMessage = {
      type: GET_CONTEXT_FILE_DATA,
    };
    return this.sendToDaemonViaQueue(message);
  }

  getWorkspaceFiles(
    projectRootMap: Record<string, string>
  ): Promise<NxWorkspaceFiles> {
    const message: HandleNxWorkspaceFilesMessage = {
      type: GET_NX_WORKSPACE_FILES,
      projectRootMap,
    };
    return this.sendToDaemonViaQueue(message);
  }

  getFilesInDirectory(dir: string): Promise<string[]> {
    const message: HandleGetFilesInDirectoryMessage = {
      type: GET_FILES_IN_DIRECTORY,
      dir,
    };
    return this.sendToDaemonViaQueue(message);
  }

  hashGlob(globs: string[], exclude?: string[]): Promise<string> {
    const message: HandleHashGlobMessage = {
      type: HASH_GLOB,
      globs,
      exclude,
    };
    return this.sendToDaemonViaQueue(message);
  }

  getTaskHistoryForHashes(hashes: string[]): Promise<{
    [hash: string]: TaskRun[];
  }> {
    const message: HandleGetTaskHistoryForHashesMessage = {
      type: 'GET_TASK_HISTORY_FOR_HASHES',
      hashes,
    };

    return this.sendToDaemonViaQueue(message);
  }

  writeTaskRunsToHistory(taskRuns: TaskRun[]): Promise<void> {
    const message: HandleWriteTaskRunsToHistoryMessage = {
      type: 'WRITE_TASK_RUNS_TO_HISTORY',
      taskRuns,
    };
    return this.sendMessageToDaemon(message);
  }

  async isServerAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const socket = connect(getFullOsSocketPath(), () => {
          socket.destroy();
          resolve(true);
        });
        socket.once('error', () => {
          resolve(false);
        });
      } catch (err) {
        resolve(false);
      }
    });
  }

  private async sendToDaemonViaQueue(messageToDaemon: Message): Promise<any> {
    return this.queue.sendToQueue(() =>
      this.sendMessageToDaemon(messageToDaemon)
    );
  }

  private setUpConnection() {
    this.socketMessenger = new DaemonSocketMessenger(
      connect(getFullOsSocketPath())
    ).listen(
      (message) => this.handleMessage(message),
      () => {
        // it's ok for the daemon to terminate if the client doesn't wait on
        // any messages from the daemon
        if (this.queue.isEmpty()) {
          this.reset();
        } else {
          output.error({
            title: 'Daemon process terminated and closed the connection',
            bodyLines: [
              'Please rerun the command, which will restart the daemon.',
              `If you get this error again, check for any errors in the daemon process logs found in: ${DAEMON_OUTPUT_LOG_FILE}`,
            ],
          });
          this._daemonStatus = DaemonStatus.DISCONNECTED;
          this.currentReject?.(
            daemonProcessException(
              'Daemon process terminated and closed the connection'
            )
          );
          process.exit(1);
        }
      },
      (err) => {
        if (!err.message) {
          return this.currentReject(daemonProcessException(err.toString()));
        }

        if (err.message.startsWith('LOCK-FILES-CHANGED')) {
          // retry the current message
          // we cannot send it via the queue because we are in the middle of processing
          // a message from the queue
          return this.sendMessageToDaemon(this.currentMessage).then(
            this.currentResolve,
            this.currentReject
          );
        }

        let error: any;
        if (err.message.startsWith('connect ENOENT')) {
          error = daemonProcessException('The Daemon Server is not running');
        } else if (err.message.startsWith('connect ECONNREFUSED')) {
          error = daemonProcessException(
            `A server instance had not been fully shut down. Please try running the command again.`
          );
          killSocketOrPath();
        } else if (err.message.startsWith('read ECONNRESET')) {
          error = daemonProcessException(
            `Unable to connect to the daemon process.`
          );
        } else {
          error = daemonProcessException(err.toString());
        }
        return this.currentReject(error);
      }
    );
  }

  private async sendMessageToDaemon(message: Message): Promise<any> {
    if (this._daemonStatus == DaemonStatus.DISCONNECTED) {
      this._daemonStatus = DaemonStatus.CONNECTING;

      if (!(await this.isServerAvailable())) {
        await this.startInBackground();
      }
      this.setUpConnection();
      this._daemonStatus = DaemonStatus.CONNECTED;
      this._daemonReady();
    } else if (this._daemonStatus == DaemonStatus.CONNECTING) {
      await this._waitForDaemonReady;
    }

    return new Promise((resolve, reject) => {
      performance.mark('sendMessageToDaemon-start');

      this.currentMessage = message;
      this.currentResolve = resolve;
      this.currentReject = reject;

      this.socketMessenger.sendMessage(message);
    });
  }

  private handleMessage(serializedResult: string) {
    try {
      performance.mark('json-parse-start');
      const parsedResult = JSON.parse(serializedResult);
      performance.mark('json-parse-end');
      performance.measure(
        'deserialize daemon response',
        'json-parse-start',
        'json-parse-end'
      );
      if (parsedResult.error) {
        this.currentReject(parsedResult.error);
      } else {
        performance.measure(
          'total for sendMessageToDaemon()',
          'sendMessageToDaemon-start',
          'json-parse-end'
        );
        return this.currentResolve(parsedResult);
      }
    } catch (e) {
      const endOfResponse =
        serializedResult.length > 300
          ? serializedResult.substring(serializedResult.length - 300)
          : serializedResult;
      this.currentReject(
        daemonProcessException(
          [
            'Could not deserialize response from Nx daemon.',
            `Message: ${e.message}`,
            '\n',
            `Received:`,
            endOfResponse,
            '\n',
          ].join('\n')
        )
      );
    }
  }

  async startInBackground(): Promise<ChildProcess['pid']> {
    ensureDirSync(DAEMON_DIR_FOR_CURRENT_WORKSPACE);
    ensureFileSync(DAEMON_OUTPUT_LOG_FILE);

    this._out = await open(DAEMON_OUTPUT_LOG_FILE, 'a');
    this._err = await open(DAEMON_OUTPUT_LOG_FILE, 'a');

    const backgroundProcess = spawn(
      process.execPath,
      [join(__dirname, `../server/start.js`)],
      {
        cwd: workspaceRoot,
        stdio: ['ignore', this._out.fd, this._err.fd],
        detached: true,
        windowsHide: true,
        shell: false,
        env: {
          ...process.env,
          ...DAEMON_ENV_SETTINGS,
        },
      }
    );
    backgroundProcess.unref();

    /**
     * Ensure the server is actually available to connect to via IPC before resolving
     */
    let attempts = 0;
    return new Promise((resolve, reject) => {
      const id = setInterval(async () => {
        if (await this.isServerAvailable()) {
          clearInterval(id);
          resolve(backgroundProcess.pid);
        } else if (attempts > 6000) {
          // daemon fails to start, the process probably exited
          // we print the logs and exit the client
          reject(
            daemonProcessException(
              'Failed to start or connect to the Nx Daemon process.'
            )
          );
        } else {
          attempts++;
        }
      }, 10);
    });
  }

  async stop(): Promise<void> {
    try {
      await safelyCleanUpExistingProcess();
    } catch (err) {
      output.error({
        title:
          err?.message ||
          'Something unexpected went wrong when stopping the server',
      });
    }

    removeSocketDir();
  }
}

export const daemonClient = new DaemonClient();

function isDocker() {
  try {
    statSync('/.dockerenv');
    return true;
  } catch {
    try {
      return readFileSync('/proc/self/cgroup', 'utf8')?.includes('docker');
    } catch {}

    return false;
  }
}

function nxJsonIsNotPresent() {
  return !hasNxJson(workspaceRoot);
}

function daemonProcessException(message: string) {
  try {
    let log = readFileSync(DAEMON_OUTPUT_LOG_FILE).toString().split('\n');
    if (log.length > 20) {
      log = log.slice(log.length - 20);
    }
    const error = new Error(
      [
        message,
        '',
        'Messages from the log:',
        ...log,
        '\n',
        `More information: ${DAEMON_OUTPUT_LOG_FILE}`,
      ].join('\n')
    );
    (error as any).internalDaemonError = true;
    return error;
  } catch (e) {
    return new Error(message);
  }
}
