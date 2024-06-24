import {
  type Tree,
  addProjectConfiguration,
  joinPathFragments,
  readProjectConfiguration,
  updateProjectConfiguration,
  ensurePackage,
  getPackageManagerCommand,
} from '@nx/devkit';
import { type NormalizedSchema } from './normalize-options';
import { getPackageVersion } from '../../../utils/versions';

export async function addE2E(tree: Tree, options: NormalizedSchema) {
  if (options.e2eTestRunner === 'cypress') {
    const { configurationGenerator } = ensurePackage<
      typeof import('@nx/cypress')
    >('@nx/cypress', getPackageVersion(tree, 'nx'));

    addProjectConfiguration(tree, options.e2eProjectName, {
      projectType: 'application',
      root: options.e2eProjectRoot,
      sourceRoot: joinPathFragments(options.e2eProjectRoot, 'src'),
      targets: {},
      tags: [],
      implicitDependencies: [options.projectName],
    });

    return await configurationGenerator(tree, {
      project: options.e2eProjectName,
      directory: 'src',
      skipFormat: true,
      devServerTarget: `${options.projectName}:${options.e2eWebServerTarget}:development`,
      baseUrl: options.e2eWebServerAddress,
      addPlugin: options.addPlugin,
    });
  } else if (options.e2eTestRunner === 'playwright') {
    const { configurationGenerator } = ensurePackage<
      typeof import('@nx/playwright')
    >('@nx/playwright', getPackageVersion(tree, 'nx'));

    addProjectConfiguration(tree, options.e2eProjectName, {
      projectType: 'application',
      root: options.e2eProjectRoot,
      sourceRoot: joinPathFragments(options.e2eProjectRoot, 'src'),
      targets: {},
      tags: [],
      implicitDependencies: [options.projectName],
    });

    return configurationGenerator(tree, {
      project: options.e2eProjectName,
      skipFormat: true,
      skipPackageJson: false,
      directory: 'src',
      js: false,
      linter: options.linter,
      setParserOptionsProject: false,
      webServerCommand: `${getPackageManagerCommand().exec} nx ${
        options.e2eWebServerTarget
      } ${options.name}`,
      webServerAddress: options.e2eWebServerAddress,
      rootProject: options.rootProject,
      addPlugin: options.addPlugin,
    });
  } else {
    return () => {};
  }
}
