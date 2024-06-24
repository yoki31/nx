import { TasksSchedule } from './tasks-schedule';
import { removeTasksFromTaskGraph } from './utils';
import { Task, TaskGraph } from '../config/task-graph';
import { DependencyType, ProjectGraph } from '../config/project-graph';
import * as nxJsonUtils from '../config/nx-json';
import * as executorUtils from '../command-line/run/executor-utils';

function createMockTask(id: string): Task {
  const [project, target] = id.split(':');
  return {
    id,
    target: {
      project,
      target,
    },
    outputs: [],
    overrides: {},
  };
}

describe('TasksSchedule', () => {
  describe('dependent tasks', () => {
    let taskSchedule: TasksSchedule;
    let taskGraph: TaskGraph;
    let app1Build: Task;
    let app2Build: Task;
    let lib1Build: Task;
    let lifeCycle: any;
    beforeEach(() => {
      app1Build = createMockTask('app1:build');
      app2Build = createMockTask('app2:build');
      lib1Build = createMockTask('lib1:build');

      taskGraph = {
        tasks: {
          'app1:build': app1Build,
          'app2:build': app2Build,
          'lib1:build': lib1Build,
        },
        dependencies: {
          'app1:build': ['lib1:build'],
          'app2:build': [],
          'lib1:build': [],
        },
        roots: ['lib1:build', 'app2:build'],
      };
      jest.spyOn(nxJsonUtils, 'readNxJson').mockReturnValue({});
      jest.spyOn(executorUtils, 'getExecutorInformation').mockReturnValue({
        schema: {
          version: 2,
          properties: {},
        },
        implementationFactory: jest.fn(),
        batchImplementationFactory: jest.fn(),
        isNgCompat: true,
        isNxExecutor: true,
      });

      const projectGraph: ProjectGraph = {
        nodes: {
          app1: {
            data: {
              root: 'app1',
              targets: {
                build: {
                  executor: 'awesome-executors:build',
                },
              },
            },
            name: 'app1',
            type: 'app',
          },
          app2: {
            name: 'app2',
            type: 'app',
            data: {
              root: 'app2',
              targets: {
                build: {
                  executor: 'awesome-executors:app2-build',
                },
              },
            },
          },
          lib1: {
            name: 'lib1',
            type: 'lib',
            data: {
              root: 'lib1',
              targets: {
                build: {
                  executor: 'awesome-executors:build',
                },
              },
            },
          },
        } as any,
        dependencies: {
          app1: [
            {
              source: 'app1',
              target: 'lib1',
              type: DependencyType.static,
            },
          ],
          app2: [
            {
              source: 'app2',
              target: 'lib1',
              type: DependencyType.static,
            },
          ],
        },
        externalNodes: {},
        version: '5',
      };

      lifeCycle = {
        startTask: jest.fn(),
        endTask: jest.fn(),
        scheduleTask: jest.fn(),
      };
      taskSchedule = new TasksSchedule(projectGraph, taskGraph, {
        lifeCycle,
      });
    });

    describe('Without Batch Mode', () => {
      let original;
      beforeEach(() => {
        original = process.env['NX_BATCH_MODE'];
        process.env['NX_BATCH_MODE'] = 'false';
      });

      afterEach(() => {
        process.env['NX_BATCH_MODE'] = original;
      });

      it('should begin with no scheduled tasks', () => {
        expect(taskSchedule.nextBatch()).toBeNull();
        expect(taskSchedule.nextTask()).toBeNull();
      });

      it('should schedule root tasks first', async () => {
        await taskSchedule.scheduleNextTasks();
        expect(taskSchedule.nextTask()).toEqual(lib1Build);
        expect(taskSchedule.nextTask()).toEqual(app2Build);
      });

      it('should not schedule any tasks that still have uncompleted dependencies', async () => {
        await taskSchedule.scheduleNextTasks();
        taskSchedule.nextTask();
        taskSchedule.nextTask();
        expect(taskSchedule.nextTask()).toBeNull();

        taskSchedule.complete([app2Build.id]);

        expect(taskSchedule.nextTask()).toBeNull();
      });

      it('should continue to schedule tasks that have completed dependencies', async () => {
        await taskSchedule.scheduleNextTasks();
        taskSchedule.nextTask();
        taskSchedule.nextTask();
        taskSchedule.complete([lib1Build.id]);

        await taskSchedule.scheduleNextTasks();
        expect(taskSchedule.nextTask()).toEqual(app1Build);
      });

      it('should run out of tasks when they are all complete', async () => {
        await taskSchedule.scheduleNextTasks();
        taskSchedule.nextTask();
        taskSchedule.nextTask();
        taskSchedule.complete([lib1Build.id, app1Build.id, app2Build.id]);

        expect(taskSchedule.hasTasks()).toEqual(false);
      });

      it('should not schedule batches', async () => {
        await taskSchedule.scheduleNextTasks();

        expect(taskSchedule.nextTask()).not.toBeNull();

        expect(taskSchedule.nextBatch()).toBeNull();
      });
    });

    describe('With Batch Mode', () => {
      let original;
      beforeEach(() => {
        original = process.env['NX_BATCH_MODE'];
        process.env['NX_BATCH_MODE'] = 'true';
      });

      afterEach(() => {
        process.env['NX_BATCH_MODE'] = original;
      });

      it('should schedule batches of tasks by different executors', async () => {
        await taskSchedule.scheduleNextTasks();

        expect(taskSchedule.nextTask()).toBeNull();

        expect(taskSchedule.nextBatch()).toEqual({
          executorName: 'awesome-executors:build',
          taskGraph: removeTasksFromTaskGraph(taskGraph, ['app2:build']),
        });
        expect(taskSchedule.nextBatch()).toEqual({
          executorName: 'awesome-executors:app2-build',
          taskGraph: removeTasksFromTaskGraph(taskGraph, [
            'app1:build',
            'lib1:build',
          ]),
        });
      });

      it('should run out of tasks when all batches are done', async () => {
        await taskSchedule.scheduleNextTasks();
        taskSchedule.nextBatch();
        taskSchedule.nextBatch();
        taskSchedule.complete(['app1:build', 'lib1:build', 'app2:build']);
        expect(taskSchedule.hasTasks()).toEqual(false);
      });
    });
  });

  describe('non-dependent tasks', () => {
    let taskSchedule: TasksSchedule;
    let taskGraph: TaskGraph;
    let app1Test: Task;
    let app2Test: Task;
    let lib1Test: Task;
    let lifeCycle: any;
    beforeEach(() => {
      app1Test = createMockTask('app1:test');
      app2Test = createMockTask('app2:test');
      lib1Test = createMockTask('lib1:test');

      taskGraph = {
        tasks: {
          'app1:test': app1Test,
          'app2:test': app2Test,
          'lib1:test': lib1Test,
        },
        dependencies: {
          'app1:test': [],
          'app2:test': [],
          'lib1:test': [],
        },
        roots: ['app1:test', 'app2:test', 'lib1:test'],
      };
      jest.spyOn(nxJsonUtils, 'readNxJson').mockReturnValue({});
      jest.spyOn(executorUtils, 'getExecutorInformation').mockReturnValue({
        schema: {
          version: 2,
          properties: {},
        },
        implementationFactory: jest.fn(),
        batchImplementationFactory: jest.fn(),
        isNgCompat: true,
        isNxExecutor: true,
      });

      const projectGraph: ProjectGraph = {
        nodes: {
          app1: {
            data: {
              root: 'app1',
              targets: {
                test: {
                  executor: 'awesome-executors:test',
                },
              },
            },
            name: 'app1',
            type: 'app',
          },
          app2: {
            name: 'app2',
            type: 'app',
            data: {
              root: 'app2',
              targets: {
                test: {
                  executor: 'awesome-executors:app2-test',
                },
              },
            },
          },
          lib1: {
            name: 'lib1',
            type: 'lib',
            data: {
              root: 'lib1',
              targets: {
                test: {
                  executor: 'awesome-executors:test',
                },
              },
            },
          },
        } as any,
        dependencies: {
          app1: [
            {
              source: 'app1',
              target: 'lib1',
              type: DependencyType.static,
            },
          ],
          app2: [
            {
              source: 'app2',
              target: 'lib1',
              type: DependencyType.static,
            },
          ],
        },
        externalNodes: {},
        version: '5',
      };

      lifeCycle = {
        startTask: jest.fn(),
        endTask: jest.fn(),
        scheduleTask: jest.fn(),
      };
      taskSchedule = new TasksSchedule(projectGraph, taskGraph, {
        lifeCycle,
      });
    });

    describe('Without Batch Mode', () => {
      let original;
      beforeEach(() => {
        original = process.env['NX_BATCH_MODE'];
        process.env['NX_BATCH_MODE'] = 'false';
      });

      afterEach(() => {
        process.env['NX_BATCH_MODE'] = original;
      });

      it('should begin with no scheduled tasks', () => {
        expect(taskSchedule.nextBatch()).toBeNull();
        expect(taskSchedule.nextTask()).toBeNull();
      });

      it('should schedule root tasks in topological order', async () => {
        await taskSchedule.scheduleNextTasks();
        expect(taskSchedule.nextTask()).toEqual(lib1Test);
        expect(taskSchedule.nextTask()).toEqual(app1Test);
        expect(taskSchedule.nextTask()).toEqual(app2Test);
      });

      it('should run out of tasks when they are all complete', async () => {
        await taskSchedule.scheduleNextTasks();
        taskSchedule.nextTask();
        taskSchedule.nextTask();
        taskSchedule.nextTask();
        taskSchedule.complete([lib1Test.id, app1Test.id, app2Test.id]);

        expect(taskSchedule.hasTasks()).toEqual(false);
      });

      it('should not schedule batches', async () => {
        await taskSchedule.scheduleNextTasks();

        expect(taskSchedule.nextTask()).not.toBeNull();

        expect(taskSchedule.nextBatch()).toBeNull();
      });
    });

    describe('With Batch Mode', () => {
      let original;
      beforeEach(() => {
        original = process.env['NX_BATCH_MODE'];
        process.env['NX_BATCH_MODE'] = 'true';
      });

      afterEach(() => {
        process.env['NX_BATCH_MODE'] = original;
      });

      it('should schedule batches of tasks by different executors', async () => {
        await taskSchedule.scheduleNextTasks();

        expect(taskSchedule.nextTask()).toBeNull();

        expect(taskSchedule.nextBatch()).toEqual({
          executorName: 'awesome-executors:test',
          taskGraph: removeTasksFromTaskGraph(taskGraph, ['app2:test']),
        });
        expect(taskSchedule.nextBatch()).toEqual({
          executorName: 'awesome-executors:app2-test',
          taskGraph: removeTasksFromTaskGraph(taskGraph, [
            'app1:test',
            'lib1:test',
          ]),
        });
      });

      it('should run out of tasks when all batches are done', async () => {
        await taskSchedule.scheduleNextTasks();
        taskSchedule.nextBatch();
        taskSchedule.nextBatch();
        taskSchedule.complete(['app1:test', 'lib1:test', 'app2:test']);
        expect(taskSchedule.hasTasks()).toEqual(false);
      });
    });
  });
});
