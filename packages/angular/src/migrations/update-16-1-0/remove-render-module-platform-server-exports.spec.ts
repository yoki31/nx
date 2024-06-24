import type { Tree } from '@nx/devkit';
import * as devkit from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import migration from './remove-render-module-platform-server-exports';

describe('remove-render-module-platform-server-exports migration', () => {
  let tree: Tree;
  const testTypeScriptFilePath = 'test.ts';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    jest
      .spyOn(devkit, 'formatFiles')
      .mockImplementation(() => Promise.resolve());
  });

  describe(`Migration to remove '@angular/platform-server' exports`, () => {
    it(`should delete '@angular/platform-server' export when 'renderModule' is the only exported symbol`, async () => {
      tree.write(
        testTypeScriptFilePath,
        `
          import { Path, join } from '@angular-devkit/core';
          export { renderModule } from '@angular/platform-server';
        `
      );

      await migration(tree);

      const content = tree.read(testTypeScriptFilePath, 'utf-8');
      expect(content).not.toContain('@angular/platform-server');
      expect(content).toContain(
        `import { Path, join } from '@angular-devkit/core';`
      );
    });

    it(`should delete only 'renderModule' when there are additional exports`, async () => {
      tree.write(
        testTypeScriptFilePath,
        `
          import { Path, join } from '@angular-devkit/core';
          export { renderModule, ServerModule } from '@angular/platform-server';
        `
      );

      await migration(tree);

      const content = tree.read(testTypeScriptFilePath, 'utf-8');

      expect(content).toContain(
        `import { Path, join } from '@angular-devkit/core';`
      );
      expect(content).toContain(
        `export { ServerModule } from '@angular/platform-server';`
      );
    });

    it(`should not delete 'renderModule' when it's exported from another module`, async () => {
      tree.write(
        testTypeScriptFilePath,
        `
          export { renderModule } from '@angular/core';
        `
      );

      await migration(tree);

      const content = tree.read(testTypeScriptFilePath, 'utf-8');
      expect(content).toContain(
        `export { renderModule } from '@angular/core';`
      );
    });

    it(`should not delete 'renderModule' when it's imported from '@angular/platform-server'`, async () => {
      tree.write(
        testTypeScriptFilePath,
        `
          import { renderModule } from '@angular/platform-server';
        `
      );

      await migration(tree);

      const content = tree.read(testTypeScriptFilePath, 'utf-8');
      expect(content).toContain(
        `import { renderModule } from '@angular/platform-server'`
      );
    });
  });
});
