import { Schema } from './schema';
import {
  formatFiles,
  joinPathFragments,
  readProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nx/devkit';

export async function runCommandsGenerator(host: Tree, schema: Schema) {
  const project = readProjectConfiguration(host, schema.project);
  project.targets = project.targets || {};
  project.targets[schema.name] = {
    executor: 'nx:run-commands',
    outputs: schema.outputs
      ? schema.outputs
          .split(',')
          .map((s) => joinPathFragments('{workspaceRoot}', s.trim()))
      : [],
    options: {
      command: schema.command,
      cwd: schema.cwd,
      envFile: schema.envFile,
    },
  };
  updateProjectConfiguration(host, schema.project, project);

  await formatFiles(host);
}

export default runCommandsGenerator;
