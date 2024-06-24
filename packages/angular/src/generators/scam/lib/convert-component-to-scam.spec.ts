import { addProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { componentGenerator } from '../../component/component';
import { convertComponentToScam } from './convert-component-to-scam';

describe('convertComponentToScam', () => {
  it('should create the scam inline correctly', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await componentGenerator(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      standalone: false,
      skipFormat: true,
    });

    // ACT
    convertComponentToScam(tree, {
      directory: 'apps/app1/src/app/example',
      fileName: 'example.component',
      filePath: 'apps/app1/src/app/example/example.component.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      inlineScam: true,
      path: 'apps/app1/src/app',
      symbolName: 'ExampleComponent',
    });

    // ASSERT
    const componentSource = tree.read(
      'apps/app1/src/app/example/example.component.ts',
      'utf-8'
    );
    expect(componentSource).toMatchInlineSnapshot(`
      "import { Component, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Component({
        selector: 'example',
        templateUrl: './example.component.html',
        styleUrl: './example.component.css'
      })
      export class ExampleComponent {}

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleComponent],
        exports: [ExampleComponent],
      })
      export class ExampleComponentModule {}
      "
    `);
  });

  it('should create the scam separately correctly', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await componentGenerator(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      standalone: false,
      skipFormat: true,
    });

    // ACT
    convertComponentToScam(tree, {
      directory: 'apps/app1/src/app/example',
      fileName: 'example.component',
      filePath: 'apps/app1/src/app/example/example.component.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      inlineScam: false,
      path: 'apps/app1/src/app',
      symbolName: 'ExampleComponent',
    });

    // ASSERT
    const componentModuleSource = tree.read(
      'apps/app1/src/app/example/example.module.ts',
      'utf-8'
    );
    expect(componentModuleSource).toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { ExampleComponent } from './example.component';

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleComponent],
        exports: [ExampleComponent],
      })
      export class ExampleComponentModule {}
      "
    `);
  });

  it('should create the scam inline correctly when --flat', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await componentGenerator(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: true,
      standalone: false,
      skipFormat: true,
    });

    // ACT
    convertComponentToScam(tree, {
      directory: 'apps/app1/src/app',
      fileName: 'example.component',
      filePath: 'apps/app1/src/app/example.component.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      inlineScam: true,
      flat: true,
      path: 'apps/app1/src/app',
      symbolName: 'ExampleComponent',
    });

    // ASSERT
    const componentSource = tree.read(
      'apps/app1/src/app/example.component.ts',
      'utf-8'
    );
    expect(componentSource).toMatchInlineSnapshot(`
      "import { Component, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Component({
        selector: 'example',
        templateUrl: './example.component.html',
        styleUrl: './example.component.css'
      })
      export class ExampleComponent {}

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleComponent],
        exports: [ExampleComponent],
      })
      export class ExampleComponentModule {}
      "
    `);
  });

  it('should create the scam separately correctly when --flat', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await componentGenerator(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: true,
      standalone: false,
      skipFormat: true,
    });

    // ACT
    convertComponentToScam(tree, {
      directory: 'apps/app1/src/app',
      fileName: 'example.component',
      filePath: 'apps/app1/src/app/example.component.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      inlineScam: false,
      flat: true,
      path: 'apps/app1/src/app',
      symbolName: 'ExampleComponent',
    });

    // ASSERT
    const componentModuleSource = tree.read(
      'apps/app1/src/app/example.module.ts',
      'utf-8'
    );
    expect(componentModuleSource).toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { ExampleComponent } from './example.component';

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleComponent],
        exports: [ExampleComponent],
      })
      export class ExampleComponentModule {}
      "
    `);
  });

  it('should create the scam inline correctly when --type', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await componentGenerator(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: true,
      type: 'random',
      standalone: false,
      skipFormat: true,
    });

    // ACT
    convertComponentToScam(tree, {
      directory: 'apps/app1/src/app',
      fileName: 'example.random',
      filePath: 'apps/app1/src/app/example.random.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      inlineScam: true,
      flat: true,
      type: 'random',
      path: 'apps/app1/src/app',
      symbolName: 'ExampleRandom',
    });

    // ASSERT
    const componentSource = tree.read(
      'apps/app1/src/app/example.random.ts',
      'utf-8'
    );
    expect(componentSource).toMatchInlineSnapshot(`
      "import { Component, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Component({
        selector: 'example',
        templateUrl: './example.random.html',
        styleUrl: './example.random.css'
      })
      export class ExampleRandom {}

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleRandom],
        exports: [ExampleRandom],
      })
      export class ExampleRandomModule {}
      "
    `);
  });

  it('should create the scam separately correctly when --type', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await componentGenerator(tree, {
      name: 'example',
      project: 'app1',
      skipImport: true,
      export: false,
      flat: true,
      type: 'random',
      standalone: false,
      skipFormat: true,
    });

    // ACT
    convertComponentToScam(tree, {
      directory: 'apps/app1/src/app',
      fileName: 'example.random',
      filePath: 'apps/app1/src/app/example.random.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      inlineScam: false,
      flat: true,
      type: 'random',
      path: 'apps/app1/src/app',
      symbolName: 'ExampleRandom',
    });

    // ASSERT
    const componentModuleSource = tree.read(
      'apps/app1/src/app/example.module.ts',
      'utf-8'
    );
    expect(componentModuleSource).toMatchInlineSnapshot(`
      "import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { ExampleRandom } from './example.random';

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleRandom],
        exports: [ExampleRandom],
      })
      export class ExampleRandomModule {}
      "
    `);
  });

  it('should place the component and scam in the correct folder when --path is used', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await componentGenerator(tree, {
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
    convertComponentToScam(tree, {
      directory: 'apps/app1/src/app/random/example',
      fileName: 'example.component',
      filePath: 'apps/app1/src/app/random/example/example.component.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      flat: false,
      inlineScam: true,
      path: 'apps/app1/src/app/random',
      symbolName: 'ExampleComponent',
    });

    // ASSERT
    const componentModuleSource = tree.read(
      'apps/app1/src/app/random/example/example.component.ts',
      'utf-8'
    );
    expect(componentModuleSource).toMatchInlineSnapshot(`
      "import { Component, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Component({
        selector: 'example',
        templateUrl: './example.component.html',
        styleUrl: './example.component.css'
      })
      export class ExampleComponent {}

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleComponent],
        exports: [ExampleComponent],
      })
      export class ExampleComponentModule {}
      "
    `);
  });

  it('should place the component and scam in the correct folder when --path and --flat is used', async () => {
    // ARRANGE
    const tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
    addProjectConfiguration(tree, 'app1', {
      projectType: 'application',
      sourceRoot: 'apps/app1/src',
      root: 'apps/app1',
    });

    await componentGenerator(tree, {
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
    convertComponentToScam(tree, {
      directory: 'apps/app1/src/app/random',
      fileName: 'example.component',
      filePath: 'apps/app1/src/app/random/example.component.ts',
      name: 'example',
      projectName: 'app1',
      export: false,
      flat: true,
      inlineScam: true,
      path: 'apps/app1/src/app/random',
      symbolName: 'ExampleComponent',
    });

    // ASSERT
    const componentModuleSource = tree.read(
      'apps/app1/src/app/random/example.component.ts',
      'utf-8'
    );
    expect(componentModuleSource).toMatchInlineSnapshot(`
      "import { Component, NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';

      @Component({
        selector: 'example',
        templateUrl: './example.component.html',
        styleUrl: './example.component.css'
      })
      export class ExampleComponent {}

      @NgModule({
        imports: [CommonModule],
        declarations: [ExampleComponent],
        exports: [ExampleComponent],
      })
      export class ExampleComponentModule {}
      "
    `);
  });
});
