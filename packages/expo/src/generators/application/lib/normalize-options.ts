import { names, readNxJson, Tree } from '@nx/devkit';
import { determineProjectNameAndRootOptions } from '@nx/devkit/src/generators/project-name-and-root-utils';
import { Schema } from '../schema';
import { ExpoPluginOptions } from '../../../../plugins/plugin';

export interface NormalizedSchema extends Schema {
  className: string;
  projectName: string;
  appProjectRoot: string;
  lowerCaseName: string;
  parsedTags: string[];
  rootProject: boolean;
  e2eProjectName: string;
  e2eProjectRoot: string;
  e2eWebServerAddress: string;
  e2eWebServerTarget: string;
  e2ePort: number;
}

export async function normalizeOptions(
  host: Tree,
  options: Schema
): Promise<NormalizedSchema> {
  const {
    projectName: appProjectName,
    names: projectNames,
    projectRoot: appProjectRoot,
    projectNameAndRootFormat,
  } = await determineProjectNameAndRootOptions(host, {
    name: options.name,
    projectType: 'application',
    directory: options.directory,
    projectNameAndRootFormat: options.projectNameAndRootFormat,
    callingGenerator: '@nx/expo:application',
  });
  options.projectNameAndRootFormat = projectNameAndRootFormat;
  const nxJson = readNxJson(host);
  const addPluginDefault =
    process.env.NX_ADD_PLUGINS !== 'false' &&
    nxJson.useInferencePlugins !== false;
  options.addPlugin ??= addPluginDefault;

  const { className } = names(options.name);
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];
  const rootProject = appProjectRoot === '.';

  let e2eWebServerTarget = 'serve';
  if (options.addPlugin) {
    if (nxJson.plugins) {
      for (const plugin of nxJson.plugins) {
        if (
          typeof plugin === 'object' &&
          plugin.plugin === '@nx/expo/plugin' &&
          (plugin.options as ExpoPluginOptions).serveTargetName
        ) {
          e2eWebServerTarget = (plugin.options as ExpoPluginOptions)
            .serveTargetName;
        }
      }
    }
  }

  let e2ePort = options.addPlugin ? 8081 : 4200;
  if (
    nxJson.targetDefaults?.[e2eWebServerTarget] &&
    nxJson.targetDefaults?.[e2eWebServerTarget].options?.port
  ) {
    e2ePort = nxJson.targetDefaults?.[e2eWebServerTarget].options.port;
  }

  const e2eProjectName = rootProject ? 'e2e' : `${appProjectName}-e2e`;
  const e2eProjectRoot = rootProject ? 'e2e' : `${appProjectRoot}-e2e`;
  const e2eWebServerAddress = `http://localhost:${e2ePort}`;

  return {
    ...options,
    unitTestRunner: options.unitTestRunner || 'jest',
    e2eTestRunner: options.e2eTestRunner,
    name: projectNames.projectSimpleName,
    className,
    lowerCaseName: className.toLowerCase(),
    displayName: options.displayName || className,
    projectName: appProjectName,
    appProjectRoot,
    parsedTags,
    rootProject,
    e2eProjectName,
    e2eProjectRoot,
    e2eWebServerAddress,
    e2eWebServerTarget,
    e2ePort,
  };
}
