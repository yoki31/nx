import {
  addProjectConfiguration,
  readNxJson,
  Tree,
  updateNxJson,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { NormalizedSchema } from '../schema';
import { updateDefaultProject } from './update-default-project';

describe('updateDefaultProject', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'my-source', {
      root: 'libs/my-source',
      targets: {},
    });

    const nxJson = readNxJson(tree);

    updateNxJson(tree, {
      ...nxJson,
      defaultProject: 'my-source',
    });
  });

  it('should update the default project', async () => {
    const schema: NormalizedSchema = {
      projectName: 'my-source',
      destination: 'subfolder/my-destination',
      importPath: '@proj/subfolder-my-destination',
      updateImportPath: true,
      newProjectName: 'subfolder-my-destination',
      relativeToRootDestination: 'libs/subfolder/my-destination',
    };

    updateDefaultProject(tree, schema);

    const { defaultProject } = readNxJson(tree);
    expect(defaultProject).toBe('subfolder-my-destination');
  });
});
