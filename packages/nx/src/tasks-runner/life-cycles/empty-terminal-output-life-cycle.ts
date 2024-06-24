import { output } from '../../utils/output';
import { getPrintableCommandArgsForTask } from '../utils';
import type { LifeCycle } from '../life-cycle';
import { TaskStatus } from '../tasks-runner';

export class EmptyTerminalOutputLifeCycle implements LifeCycle {
  printTaskTerminalOutput(
    task: any,
    cacheStatus: TaskStatus,
    terminalOutput: string
  ) {
    if (
      cacheStatus === 'success' ||
      cacheStatus === 'failure' ||
      cacheStatus === 'skipped'
    ) {
      const args = getPrintableCommandArgsForTask(task);
      output.logCommandOutput(args.join(' '), cacheStatus, terminalOutput);
    }
  }
}
