import 'nx/src/internal-testing-utils/mock-project-graph';

import { createApp, createLib } from '../../utils/testing-generators';
import { logger, Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { hookGenerator } from './hook';

describe('hook', () => {
  let appTree: Tree;
  let projectName: string;

  beforeEach(async () => {
    projectName = 'my-lib';
    appTree = createTreeWithEmptyWorkspace();
    await createApp(appTree, 'my-app');
    await createLib(appTree, projectName);
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should generate files', async () => {
    await hookGenerator(appTree, {
      name: 'form',
      project: projectName,
    });

    expect(appTree.exists('my-lib/src/lib/use-form/use-form.ts')).toBeTruthy();
    expect(
      appTree.exists('my-lib/src/lib/use-form/use-form.spec.tsx')
    ).toBeTruthy();
  });

  it('should generate files for an app', async () => {
    await hookGenerator(appTree, {
      name: 'form',
      project: 'my-app',
    });

    expect(appTree.exists('my-app/src/app/use-form/use-form.ts')).toBeTruthy();
    expect(
      appTree.exists('my-app/src/app/use-form/use-form.spec.tsx')
    ).toBeTruthy();
  });

  it('handles "use" in the name', async () => {
    await hookGenerator(appTree, {
      name: 'usehello',
      project: projectName,
      skipTests: true,
    });

    expect(
      appTree.exists('my-lib/src/lib/use-hello/use-hello.ts')
    ).toBeTruthy();
    expect(
      appTree.exists('my-lib/src/lib/use-hello/use-hello.spec.tsx')
    ).toBeFalsy();
  });

  it('handles "use-" in the name', async () => {
    await hookGenerator(appTree, {
      name: 'use-hello',
      project: projectName,
      skipTests: true,
    });
    expect(
      appTree.exists('my-lib/src/lib/use-hello/use-hello.ts')
    ).toBeTruthy();
    expect(
      appTree.exists('my-lib/src/lib/use-hello/use-hello.spec.tsx')
    ).toBeFalsy();
  });

  describe('--export', () => {
    it('should add to index.ts barrel', async () => {
      await hookGenerator(appTree, {
        name: 'hello',
        project: projectName,
        export: true,
      });

      const indexContent = appTree.read('my-lib/src/index.ts', 'utf-8');

      expect(indexContent).toMatch(/lib\/use-hello/);
    });

    it('should not export from an app', async () => {
      await hookGenerator(appTree, {
        name: 'hello',
        project: 'my-app',
        export: true,
      });

      const indexContent = appTree.read('my-lib/src/index.ts', 'utf-8');

      expect(indexContent).not.toMatch(/lib\/use-hello/);
    });
  });

  describe('--skipTests', () => {
    it('should not generate tests', async () => {
      await hookGenerator(appTree, {
        name: 'hello',
        project: projectName,
        skipTests: true,
      });
      expect(
        appTree.exists('my-lib/src/lib/use-hello/use-hello.ts')
      ).toBeTruthy();
      expect(
        appTree.exists('my-lib/src/lib/use-hello/use-hello.spec.tsx')
      ).toBeFalsy();
    });
  });

  describe('--pascalCaseFiles', () => {
    it('should generate component files with pascal case names', async () => {
      await hookGenerator(appTree, {
        name: 'hello',
        project: projectName,
        pascalCaseFiles: true,
      });
      expect(
        appTree.exists('my-lib/src/lib/use-hello/useHello.ts')
      ).toBeTruthy();
      expect(
        appTree.exists('my-lib/src/lib/use-hello/useHello.spec.tsx')
      ).toBeTruthy();
    });
  });

  describe('--pascalCaseDirectory', () => {
    it('should generate component files with pascal case directory name', async () => {
      await hookGenerator(appTree, {
        name: 'hello',
        project: projectName,
        pascalCaseFiles: true,
        pascalCaseDirectory: true,
      });
      expect(
        appTree.exists('my-lib/src/lib/useHello/useHello.ts')
      ).toBeTruthy();
      expect(
        appTree.exists('my-lib/src/lib/useHello/useHello.spec.tsx')
      ).toBeTruthy();
    });
  });

  describe('--directory', () => {
    it('should create component under the directory', async () => {
      await hookGenerator(appTree, {
        name: 'hello',
        project: projectName,
        directory: 'hooks',
        skipTests: true,
      });

      expect(appTree.exists('/my-lib/src/hooks/use-hello/use-hello.ts'));
    });

    it('should create with nested directories', async () => {
      await hookGenerator(appTree, {
        name: 'helloWorld',
        project: projectName,
        directory: 'lib/foo',
        skipTests: true,
      });

      expect(
        appTree.exists('/my-lib/src/lib/foo/use-hello-world/use-hello-world.ts')
      );
    });
  });

  describe('--flat', () => {
    it('should create in project directory rather than in its own folder', async () => {
      await hookGenerator(appTree, {
        name: 'hello',
        project: projectName,
        flat: true,
        skipTests: true,
      });

      expect(appTree.exists('/my-lib/src/lib/use-hello.ts'));
    });

    it('should work with custom directory path', async () => {
      await hookGenerator(appTree, {
        name: 'hello',
        project: projectName,
        flat: true,
        directory: 'hooks',
        skipTests: true,
      });

      expect(appTree.exists('/my-lib/src/hooks/use-hello.ts'));
    });
  });
});
