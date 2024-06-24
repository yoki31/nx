import { addProjectConfiguration, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { scamPipeGenerator } from './scam-pipe';

describe('SCAM Pipe Generator', () => {
  it('should create the inline scam pipe correctly', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    // ACT
    await scamPipeGenerator(tree, {
      name: 'example',
      project: 'app1',
      inlineScam: true,
      flat: false,
      skipFormat: true,
    });

    // ASSERT
    const pipeSource = tree.read(
      'apps/app1/src/app/example/example.pipe.ts',
      'utf-8'
    );
    expect(pipeSource).toMatchInlineSnapshot(`
      "import { Pipe, PipeTransform, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Pipe({
        name: 'example'
      })
      export class ExamplePipe implements PipeTransform {
        transform(value: unknown, ...args: unknown[]): unknown {
          return null;
        }
      }

      @NgModule({
        imports: [CommonModule],
        declarations: [ExamplePipe],
        exports: [ExamplePipe],
      })
      export class ExamplePipeModule {}
      "
    `);
  });

  it('should create the separate scam pipe correctly', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    // ACT
    await scamPipeGenerator(tree, {
      name: 'example',
      project: 'app1',
      inlineScam: false,
      flat: false,
      skipFormat: true,
    });

    // ASSERT
    const pipeModuleSource = tree.read(
      'apps/app1/src/app/example/example.module.ts',
      'utf-8'
    );
    expect(pipeModuleSource).toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { ExamplePipe } from './example.pipe';

      @NgModule({
        imports: [CommonModule],
        declarations: [ExamplePipe],
        exports: [ExamplePipe],
      })
      export class ExamplePipeModule {}
      "
    `);
  });

  it('should create the scam pipe correctly and export it for a secondary entrypoint', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'lib1', {
      projectType: 'library',
      sourceRoot: 'libs/lib1/src',
      root: 'libs/lib1',
    });
    tree.write('libs/lib1/feature/src/index.ts', '');
    writeJson(tree, 'libs/lib1/feature/ng-package.json', {
      lib: { entryFile: './src/index.ts' },
    });

    // ACT
    await scamPipeGenerator(tree, {
      name: 'example',
      project: 'lib1',
      path: 'libs/lib1/feature/src/lib',
      inlineScam: false,
      export: true,
      skipFormat: true,
    });

    // ASSERT
    const pipeModuleSource = tree.read(
      'libs/lib1/feature/src/lib/example/example.module.ts',
      'utf-8'
    );
    expect(pipeModuleSource).toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { ExamplePipe } from './example.pipe';

      @NgModule({
        imports: [CommonModule],
        declarations: [ExamplePipe],
        exports: [ExamplePipe],
      })
      export class ExamplePipeModule {}
      "
    `);
    const secondaryEntryPointSource = tree.read(
      `libs/lib1/feature/src/index.ts`,
      'utf-8'
    );
    expect(secondaryEntryPointSource).toMatchInlineSnapshot(`
      "export * from './lib/example/example.pipe';
      export * from './lib/example/example.module';"
    `);
  });

  describe('--path', () => {
    it('should not throw when the path does not exist under project', async () => {
      // ARRANGE
      const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
      addProjectConfiguration(tree, 'app1', {
        projectType: 'application',
        sourceRoot: 'apps/app1/src',
        root: 'apps/app1',
      });

      // ACT
      await scamPipeGenerator(tree, {
        name: 'example',
        project: 'app1',
        path: 'apps/app1/src/app/random',
        inlineScam: true,
        flat: false,
        skipFormat: true,
      });

      // ASSERT
      const pipeSource = tree.read(
        'apps/app1/src/app/random/example/example.pipe.ts',
        'utf-8'
      );
      expect(pipeSource).toMatchInlineSnapshot(`
        "import { Pipe, PipeTransform, NgModule } from '@angular/core';
        import { CommonModule } from '@angular/common';

        @Pipe({
          name: 'example'
        })
        export class ExamplePipe implements PipeTransform {
          transform(value: unknown, ...args: unknown[]): unknown {
            return null;
          }
        }

        @NgModule({
          imports: [CommonModule],
          declarations: [ExamplePipe],
          exports: [ExamplePipe],
        })
        export class ExamplePipeModule {}
        "
      `);
    });

    it('should not matter if the path starts with a slash', async () => {
      // ARRANGE
      const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
      addProjectConfiguration(tree, 'app1', {
        projectType: 'application',
        sourceRoot: 'apps/app1/src',
        root: 'apps/app1',
      });

      // ACT
      await scamPipeGenerator(tree, {
        name: 'example',
        project: 'app1',
        path: '/apps/app1/src/app/random',
        inlineScam: true,
        flat: false,
        skipFormat: true,
      });

      // ASSERT
      const pipeSource = tree.read(
        'apps/app1/src/app/random/example/example.pipe.ts',
        'utf-8'
      );
      expect(pipeSource).toMatchInlineSnapshot(`
        "import { Pipe, PipeTransform, NgModule } from '@angular/core';
        import { CommonModule } from '@angular/common';

        @Pipe({
          name: 'example'
        })
        export class ExamplePipe implements PipeTransform {
          transform(value: unknown, ...args: unknown[]): unknown {
            return null;
          }
        }

        @NgModule({
          imports: [CommonModule],
          declarations: [ExamplePipe],
          exports: [ExamplePipe],
        })
        export class ExamplePipeModule {}
        "
      `);
    });

    it('should throw when the path does not exist under project', async () => {
      // ARRANGE
      const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
      addProjectConfiguration(tree, 'app1', {
        projectType: 'application',
        sourceRoot: 'apps/app1/src',
        root: 'apps/app1',
      });

      // ACT & ASSERT
      expect(
        scamPipeGenerator(tree, {
          name: 'example',
          project: 'app1',
          path: 'libs/proj/src/lib/random',
          inlineScam: true,
          skipFormat: true,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The provided directory "libs/proj/src/lib/random" is not under the provided project root "apps/app1". Please provide a directory that is under the provided project root or use the "as-provided" format and only provide the directory."`
      );
    });
  });
});
