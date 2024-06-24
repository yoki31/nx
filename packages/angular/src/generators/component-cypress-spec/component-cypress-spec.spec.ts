import 'nx/src/internal-testing-utils/mock-project-graph';

import { installedCypressVersion } from '@nx/cypress/src/utils/cypress-version';
import type { Tree } from '@nx/devkit';
import * as devkit from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { componentGenerator } from '../component/component';
import * as storybookUtils from '../utils/storybook-ast/storybook-inputs';
import { generateTestApplication } from '../utils/testing';
import { componentCypressSpecGenerator } from './component-cypress-spec';
import { E2eTestRunner } from '../../utils/test-runners';

// need to mock cypress otherwise it'll use the nx installed version from package.json
//  which is v9 while we are testing for the new v10 version
jest.mock('@nx/cypress/src/utils/cypress-version');

describe('componentCypressSpec generator', () => {
  let tree: Tree;
  const appName = 'ng-app1';
  const specFile = `${appName}-e2e/src/e2e/test-button/test-button.component.cy.ts`;
  let mockedInstalledCypressVersion: jest.Mock<
    ReturnType<typeof installedCypressVersion>
  > = installedCypressVersion as never;
  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });

    await generateTestApplication(tree, {
      name: appName,
      skipFormat: true,
      e2eTestRunner: E2eTestRunner.Cypress,
    });
    await componentGenerator(tree, {
      name: 'test-button',
      project: appName,
      skipFormat: true,
    });

    tree.write(
      `${appName}/src/app/test-button/test-button.component.ts`,
      `import { Component, Input } from '@angular/core';

export type ButtonStyle = 'default' | 'primary' | 'accent';

@Component({
  selector: 'proj-test-button',
  templateUrl: './test-button.component.html',
  styleUrls: ['./test-button.component.css']
})
export class TestButtonComponent {
  @Input('buttonType') type = 'button';
  @Input() style: ButtonStyle = 'default';
  @Input() age?: number;
  @Input() isOn = false;      
}`
    );
  });

  it('should not generate the component spec file when it already exists', async () => {
    mockedInstalledCypressVersion.mockReturnValue(10);
    jest.spyOn(storybookUtils, 'getComponentProps');
    jest.spyOn(devkit, 'generateFiles');
    tree.write(specFile, '');

    await componentCypressSpecGenerator(tree, {
      componentFileName: 'test-button.component',
      componentName: 'TestButtonComponent',
      componentPath: `test-button`,
      projectPath: `${appName}/src/app`,
      projectName: appName,
      skipFormat: true,
    });

    expect(storybookUtils.getComponentProps).not.toHaveBeenCalled();
    expect(devkit.generateFiles).not.toHaveBeenCalled();
    expect(tree.read(specFile).toString()).toBe('');
  });

  it('should generate the component spec file', async () => {
    mockedInstalledCypressVersion.mockReturnValue(10);
    await componentCypressSpecGenerator(tree, {
      componentFileName: 'test-button.component',
      componentName: 'TestButtonComponent',
      componentPath: `test-button`,
      projectPath: `${appName}/src/app`,
      projectName: appName,
    });

    expect(tree.exists(specFile)).toBe(true);
    const specFileContent = tree.read(specFile).toString();
    expect(specFileContent).toMatchSnapshot();
  });

  it('should generate .spec.ts when using cypress.json', async () => {
    mockedInstalledCypressVersion.mockReturnValue(9);
    const v9SpecFile = `${appName}-e2e/src/integration/test-button/test-button.component.spec.ts`;
    tree.delete(`${appName}-e2e/cypress.config.ts`);
    tree.write(`${appName}-e2e/cypress.json`, `{}`);

    await componentCypressSpecGenerator(tree, {
      componentFileName: 'test-button.component',
      componentName: 'TestButtonComponent',
      componentPath: `test-button`,
      projectPath: `${appName}/src/app`,
      projectName: appName,
      skipFormat: true,
    });

    expect(tree.exists(v9SpecFile)).toBe(true);
    const specFileContent = tree.read(v9SpecFile).toString();
    expect(specFileContent).toMatchSnapshot();
  });
});
