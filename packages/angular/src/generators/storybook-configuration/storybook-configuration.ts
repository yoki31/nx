import {
  formatFiles,
  GeneratorCallback,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { updateAppEditorTsConfigExcludedFiles } from '../utils/update-app-editor-tsconfig-excluded-files';
import { assertCompatibleStorybookVersion } from './lib/assert-compatible-storybook-version';
import { generateStories } from './lib/generate-stories';
import { generateStorybookConfiguration } from './lib/generate-storybook-configuration';
import { validateOptions } from './lib/validate-options';
import type { StorybookConfigurationOptions } from './schema';

// TODO(katerina): Nx 19 -> remove Cypress
export async function storybookConfigurationGenerator(
  tree: Tree,
  options: StorybookConfigurationOptions
): Promise<GeneratorCallback> {
  assertCompatibleStorybookVersion();
  validateOptions(options);

  const storybookGeneratorInstallTask = await generateStorybookConfiguration(
    tree,
    {
      ...options,
      interactionTests: options.interactionTests ?? true, // default is true
      tsConfiguration: options.tsConfiguration ?? true, // default is true
    }
  );

  if (options.generateStories) {
    await generateStories(tree, {
      ...options,
      interactionTests: options.interactionTests ?? true,
      skipFormat: true,
    });
  }

  const project = readProjectConfiguration(tree, options.project);
  if (project.projectType === 'application') {
    updateAppEditorTsConfigExcludedFiles(tree, project);
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return storybookGeneratorInstallTask;
}

export default storybookConfigurationGenerator;
