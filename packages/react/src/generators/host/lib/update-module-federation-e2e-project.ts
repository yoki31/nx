import { NormalizedSchema } from '../schema';
import {
  Tree,
  readProjectConfiguration,
  updateProjectConfiguration,
} from '@nx/devkit';

export function updateModuleFederationE2eProject(
  host: Tree,
  options: NormalizedSchema
) {
  try {
    let projectConfig = readProjectConfiguration(host, options.e2eProjectName);
    if (projectConfig.targets.e2e.executor !== '@nx/playwright:playwright') {
      projectConfig.targets.e2e.options = {
        ...projectConfig.targets.e2e.options,
        baseUrl: `http://localhost:${options.devServerPort}`,
      };
      updateProjectConfiguration(host, options.e2eProjectName, projectConfig);
    }
  } catch {
    // nothing
  }
}
