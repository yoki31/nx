import { addProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { directiveGenerator } from '../../directive/directive';
import { convertDirectiveToScam } from './convert-directive-to-scam';

describe('convertDirectiveToScam', () => {
  it('should create the scam directive inline correctly', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await directiveGenerator(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: false,
      standalone: false,
      skipFormat: true,
    });

    // ACT
    convertDirectiveToScam(tree, {
      directory: 'apps/app1/src/app/example',
      fileName: 'example.directive',
      filePath: 'apps/app1/src/app/example/example.directive.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      flat: false,
      inlineScam: true,
      path: 'apps/app1/src/app',
      symbolName: 'ExampleDirective',
    });

    // ASSERT
    const directiveSource = tree.read(
      'apps/app1/src/app/example/example.directive.ts',
      'utf-8'
    );
    expect(directiveSource).toMatchInlineSnapshot(`
      "import { Directive, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Directive({
        selector: '[example]'
      })
      export class ExampleDirective {
        constructor() {}
      }

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleDirective],
        exports: [ExampleDirective],
      })
      export class ExampleDirectiveModule {}
      "
    `);
  });

  it('should create the scam directive separately correctly', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await directiveGenerator(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: false,
      standalone: false,
      skipFormat: true,
    });

    // ACT
    convertDirectiveToScam(tree, {
      directory: 'apps/app1/src/app/example',
      fileName: 'example.directive',
      filePath: 'apps/app1/src/app/example/example.directive.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      flat: false,
      inlineScam: false,
      path: 'apps/app1/src/app',
      symbolName: 'ExampleDirective',
    });

    // ASSERT
    const directiveModuleSource = tree.read(
      'apps/app1/src/app/example/example.module.ts',
      'utf-8'
    );
    expect(directiveModuleSource).toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { ExampleDirective } from './example.directive';

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleDirective],
        exports: [ExampleDirective],
      })
      export class ExampleDirectiveModule {}
      "
    `);
  });

  it('should create the scam directive inline correctly when --flat', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await directiveGenerator(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: true,
      standalone: false,
      skipFormat: true,
    });

    // ACT
    convertDirectiveToScam(tree, {
      directory: 'apps/app1/src/app',
      fileName: 'example.directive',
      filePath: 'apps/app1/src/app/example.directive.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      inlineScam: true,
      flat: true,
      path: 'apps/app1/src/app',
      symbolName: 'ExampleDirective',
    });

    // ASSERT
    const directiveSource = tree.read(
      'apps/app1/src/app/example.directive.ts',
      'utf-8'
    );
    expect(directiveSource).toMatchInlineSnapshot(`
      "import { Directive, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Directive({
        selector: '[example]'
      })
      export class ExampleDirective {
        constructor() {}
      }

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleDirective],
        exports: [ExampleDirective],
      })
      export class ExampleDirectiveModule {}
      "
    `);
  });

  it('should create the scam directive separately correctly when --flat', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await directiveGenerator(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: true,
      standalone: false,
      skipFormat: true,
    });

    // ACT
    convertDirectiveToScam(tree, {
      directory: 'apps/app1/src/app',
      fileName: 'example.directive',
      filePath: 'apps/app1/src/app/example.directive.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      inlineScam: false,
      flat: true,
      path: 'apps/app1/src/app',
      symbolName: 'ExampleDirective',
    });

    // ASSERT
    const directiveModuleSource = tree.read(
      'apps/app1/src/app/example.module.ts',
      'utf-8'
    );
    expect(directiveModuleSource).toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { ExampleDirective } from './example.directive';

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleDirective],
        exports: [ExampleDirective],
      })
      export class ExampleDirectiveModule {}
      "
    `);
  });

  it('should place the directive and scam directive in the correct folder when --path is used', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await directiveGenerator(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: false,
      path: 'apps/app1/src/app/random',
      standalone: false,
      skipFormat: true,
    });

    // ACT
    convertDirectiveToScam(tree, {
      directory: 'apps/app1/src/app/random/example',
      fileName: 'example.directive',
      filePath: 'apps/app1/src/app/random/example/example.directive.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      flat: false,
      inlineScam: true,
      path: 'apps/app1/src/app/random',
      symbolName: 'ExampleDirective',
    });

    // ASSERT
    const directiveModuleSource = tree.read(
      'apps/app1/src/app/random/example/example.directive.ts',
      'utf-8'
    );
    expect(directiveModuleSource).toMatchInlineSnapshot(`
      "import { Directive, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Directive({
        selector: '[example]'
      })
      export class ExampleDirective {
        constructor() {}
      }

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleDirective],
        exports: [ExampleDirective],
      })
      export class ExampleDirectiveModule {}
      "
    `);
  });

  it('should place the directive and scam directive in the correct folder when --path and --flat is used', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await directiveGenerator(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: true,
      path: 'apps/app1/src/app/random',
      standalone: false,
      skipFormat: true,
    });

    // ACT
    convertDirectiveToScam(tree, {
      directory: 'apps/app1/src/app/random',
      fileName: 'example.directive',
      filePath: 'apps/app1/src/app/random/example.directive.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      flat: true,
      inlineScam: true,
      path: 'apps/app1/src/app/random',
      symbolName: 'ExampleDirective',
    });

    // ASSERT
    const directiveModuleSource = tree.read(
      'apps/app1/src/app/random/example.directive.ts',
      'utf-8'
    );
    expect(directiveModuleSource).toMatchInlineSnapshot(`
      "import { Directive, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Directive({
        selector: '[example]'
      })
      export class ExampleDirective {
        constructor() {}
      }

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleDirective],
        exports: [ExampleDirective],
      })
      export class ExampleDirectiveModule {}
      "
    `);
  });
});
