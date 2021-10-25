import {
  generateFiles,
  logger,
  offsetFromRoot,
  readProjectConfiguration,
  toJS,
  Tree,
} from '@nrwl/devkit';
import { join } from 'path';
import { StorybookConfigureSchema } from '../schema';

export function createStorybookFiles(
  tree: Tree,
  schema: StorybookConfigureSchema
) {
  const { root, projectType, targets } = readProjectConfiguration(
    tree,
    schema.name
  );

  // do not proceed if not a react native project
  if (targets?.start?.executor !== '@nrwl/react-native:start') {
    return;
  }

  const storybookUIFile = join(root, '.storybook');

  if (tree.exists(storybookUIFile)) {
    logger.warn(
      `storybook file already exists for ${schema.name}! Skipping generating files.`
    );
    return;
  }

  const projectDirectory = projectType === 'application' ? 'app' : 'lib';

  logger.debug(`adding storybook file to React Native app ${projectDirectory}`);

  generateFiles(tree, join(__dirname, '../files'), root, {
    tmpl: '',
    offsetFromRoot: offsetFromRoot(root),
    projectType: projectDirectory,
  });

  if (schema.js) {
    toJS(tree);
  }
}
