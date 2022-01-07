import {
  ProjectConfiguration,
  Tree,
  formatFiles,
  getProjects,
  updateProjectConfiguration,
} from '@nrwl/devkit';

/**
 * This function add e2e-ios and e2e-android to project's targets
 */
export default async function update(tree: Tree) {
  const projects = getProjects(tree);

  for (const [name, config] of projects.entries()) {
    if (config.targets?.['build-ios']?.executor !== '@nrwl/detox:build') return;

    addE2eTargetsDetox(tree, name, config);
  }

  await formatFiles(tree);
}

function addE2eTargetsDetox(
  tree: Tree,
  name: string,
  config: ProjectConfiguration
) {
  if (!config.targets['e2e-ios']) {
    config.targets['e2e-ios'] = {
      executor: '@nrwl/workspace:run-commands',
      options: {
        command: `nx build-ios ${name} && nx test-ios ${name}`,
      },
      configurations: {
        production: {
          command: `nx build-ios ${name} --prod && nx test-ios ${name} --prod`,
        },
      },
    };
  }
  if (!config.targets['e2e-android']) {
    config.targets['e2e-android'] = {
      executor: '@nrwl/workspace:run-commands',
      options: {
        command: `nx build-android ${name} && nx test-android ${name}`,
      },
      configurations: {
        production: {
          command: `nx build-android ${name} --prod && nx test-android ${name} --prod`,
        },
      },
    };
  }
  updateProjectConfiguration(tree, name, config);
}
