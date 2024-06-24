import chalk = require('chalk');
import yargs = require('yargs');
import { examples } from '../examples';

export function linkToNxDevAndExamples<T>(
  yargs: yargs.Argv<T>,
  command: string
) {
  (examples[command] || []).forEach((t) => {
    yargs = yargs.example(t.command, t.description);
  });
  return yargs.epilog(
    chalk.bold(
      `Find more information and examples at https://nx.dev/nx/${command.replace(
        ':',
        '-'
      )}`
    )
  );
}
