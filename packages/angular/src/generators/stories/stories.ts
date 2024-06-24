import {
  addDependenciesToPackageJson,
  ensurePackage,
  formatFiles,
  GeneratorCallback,
  joinPathFragments,
  logger,
  readProjectConfiguration,
  runTasksInSerial,
  Tree,
} from '@nx/devkit';
import componentCypressSpecGenerator from '../component-cypress-spec/component-cypress-spec';
import componentStoryGenerator from '../component-story/component-story';
import type { ComponentInfo } from '../utils/storybook-ast/component-info';
import {
  getComponentsInfo,
  getStandaloneComponentsInfo,
} from '../utils/storybook-ast/component-info';
import { getProjectEntryPoints } from '../utils/storybook-ast/entry-point';
import { getE2EProject } from './lib/get-e2e-project';
import { getModuleFilePaths } from '../utils/storybook-ast/module-info';
import type { StoriesGeneratorOptions } from './schema';
import { minimatch } from 'minimatch';
import { nxVersion } from '../../utils/versions';

export async function angularStoriesGenerator(
  tree: Tree,
  options: StoriesGeneratorOptions
): Promise<GeneratorCallback> {
  const e2eProjectName = options.cypressProject ?? `${options.name}-e2e`;
  const e2eProject = getE2EProject(tree, e2eProjectName);
  const entryPoints = getProjectEntryPoints(tree, options.name);
  const componentsInfo: ComponentInfo[] = [];
  for (const entryPoint of entryPoints) {
    const moduleFilePaths = getModuleFilePaths(tree, entryPoint);
    componentsInfo.push(
      ...getComponentsInfo(tree, entryPoint, moduleFilePaths, options.name),
      ...getStandaloneComponentsInfo(tree, entryPoint)
    );
  }

  if (options.generateCypressSpecs && !e2eProject) {
    logger.info(
      `There was no e2e project "${e2eProjectName}" found, so cypress specs will not be generated. Pass "--cypressProject" to specify a different e2e project name.`
    );
  }

  const componentInfos = componentsInfo.filter(
    (f) =>
      !options.ignorePaths?.some((pattern) => {
        const shouldIgnorePath = minimatch(
          joinPathFragments(
            f.moduleFolderPath,
            f.path,
            `${f.componentFileName}.ts`
          ),
          pattern
        );
        return shouldIgnorePath;
      })
  );

  for (const info of componentInfos) {
    if (info === undefined) {
      continue;
    }

    await componentStoryGenerator(tree, {
      projectPath: info.moduleFolderPath,
      componentName: info.name,
      componentPath: info.path,
      componentFileName: info.componentFileName,
      interactionTests: options.interactionTests ?? true,
      skipFormat: true,
    });

    if (options.generateCypressSpecs && e2eProject) {
      await componentCypressSpecGenerator(tree, {
        projectName: options.name,
        projectPath: info.moduleFolderPath,
        cypressProject: options.cypressProject,
        componentName: info.name,
        componentPath: info.path,
        componentFileName: info.componentFileName,
        specDirectory: joinPathFragments(info.entryPointName, info.path),
        skipFormat: true,
      });
    }
  }
  const tasks: GeneratorCallback[] = [];

  if (options.interactionTests) {
    const { interactionTestsDependencies, addInteractionsInAddons } =
      ensurePackage<typeof import('@nx/storybook')>('@nx/storybook', nxVersion);

    const projectConfiguration = readProjectConfiguration(tree, options.name);
    addInteractionsInAddons(tree, projectConfiguration);

    tasks.push(
      addDependenciesToPackageJson(tree, {}, interactionTestsDependencies())
    );
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
  return runTasksInSerial(...tasks);
}

export default angularStoriesGenerator;
