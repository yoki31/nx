import {
  addProjectConfiguration,
  TargetConfiguration,
  Tree,
} from '@nrwl/devkit';
import { NormalizedSchema } from './normalize-options';

export function addProject(host: Tree, options: NormalizedSchema) {
  addProjectConfiguration(host, options.projectName, {
    root: options.projectRoot,
    sourceRoot: `${options.projectRoot}/src`,
    projectType: 'application',
    targets: { ...getTargets(options) },
    tags: [],
    implicitDependencies: options.project ? [options.project] : undefined,
  });
}

function getTargets(options: NormalizedSchema) {
  const architect: { [key: string]: TargetConfiguration } = {};

  architect['e2e-ios'] = {
    executor: '@nrwl/workspace:run-commands',
    options: {
      command: `nx build-ios ${options.name} && nx test-ios ${options.name}`,
    },
    configurations: {
      production: {
        command: `nx build-ios ${options.name} --prod && nx test-ios ${options.name} --prod`,
      },
    },
  };

  architect['e2e-android'] = {
    executor: '@nrwl/workspace:run-commands',
    options: {
      command: `nx build-android ${options.name} && nx test-android ${options.name}`,
    },
    configurations: {
      production: {
        command: `nx build-android ${options.name} --prod && nx test-android ${options.name} --prod`,
      },
    },
  };

  architect['build-ios'] = {
    executor: '@nrwl/detox:build',
    options: {
      detoxConfiguration: 'ios.sim.debug',
    },
    configurations: {
      production: {
        detoxConfiguration: 'ios.sim.release',
      },
    },
  };

  architect['test-ios'] = {
    executor: '@nrwl/detox:test',
    options: {
      detoxConfiguration: 'ios.sim.debug',
    },
    configurations: {
      production: {
        detoxConfiguration: 'ios.sim.release',
      },
    },
  };

  architect['build-android'] = {
    executor: '@nrwl/detox:build',
    options: {
      detoxConfiguration: 'android.emu.debug',
    },
    configurations: {
      production: {
        detoxConfiguration: 'android.emu.release',
      },
    },
  };

  architect['test-android'] = {
    executor: '@nrwl/detox:test',
    options: {
      detoxConfiguration: 'android.emu.debug',
    },
    configurations: {
      production: {
        detoxConfiguration: 'android.emu.release',
      },
    },
  };

  return architect;
}
