import { createTreeWithEmptyWorkspace } from 'nx/src/devkit-testing-exports';
import {
  getWorkspaceLayout,
  extractLayoutDirectory,
} from './get-workspace-layout';

describe('getWorkspaceLayout', () => {
  it('should return selected values', () => {
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    tree.write(
      'nx.json',
      JSON.stringify({
        workspaceLayout: {
          appsDir: 'custom-apps',
          libsDir: 'custom-libs',
        },
      })
    );
    expect(getWorkspaceLayout(tree)).toEqual({
      appsDir: 'custom-apps',
      libsDir: 'custom-libs',
      npmScope: undefined,
      standaloneAsDefault: true,
    });
  });
  it('should return apps and libs when present', () => {
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    tree.write('nx.json', JSON.stringify({}));
    tree.write('apps/file', '');
    tree.write('libs/file', '');
    tree.write('packages/file', '');
    expect(getWorkspaceLayout(tree)).toEqual({
      appsDir: 'apps',
      libsDir: 'libs',
      npmScope: undefined,
      standaloneAsDefault: true,
    });
  });

  it('should return packages when present', () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write('nx.json', JSON.stringify({}));
    tree.write('packages/file', '');
    tree.write('something/file', '');
    expect(getWorkspaceLayout(tree)).toEqual({
      appsDir: 'packages',
      libsDir: 'packages',
      npmScope: undefined,
      standaloneAsDefault: true,
    });
  });

  it('should return . in other cases', () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write('nx.json', JSON.stringify({}));
    tree.write('something/file', '');
    expect(getWorkspaceLayout(tree)).toEqual({
      appsDir: '.',
      libsDir: '.',
      npmScope: undefined,
      standaloneAsDefault: true,
    });
  });
});

describe('extractLayoutDirectory', () => {
  it('should extract layout directory', () => {
    expect(extractLayoutDirectory('apps/my-app')).toEqual({
      layoutDirectory: 'apps',
      projectDirectory: 'my-app',
    });
    expect(extractLayoutDirectory('libs/my-lib')).toEqual({
      layoutDirectory: 'libs',
      projectDirectory: 'my-lib',
    });
    expect(extractLayoutDirectory('packages/my-package')).toEqual({
      layoutDirectory: 'packages',
      projectDirectory: 'my-package',
    });
    expect(extractLayoutDirectory(undefined)).toEqual({
      layoutDirectory: null,
      projectDirectory: undefined,
    });
  });
});
