import {
  checkFilesExist,
  cleanupProject,
  newProject,
  runCLI,
  runCLIAsync,
  uniq,
} from '@nx/e2e/utils';

describe('Build React applications and libraries with Vite', () => {
  beforeAll(() => {
    newProject({
      packages: ['@nx/react'],
    });
  });

  afterAll(() => {
    cleanupProject();
  });

  it('should test and lint app with bundler=vite and compiler=babel', async () => {
    const viteApp = uniq('viteapp');

    runCLI(
      `generate @nx/react:app ${viteApp} --bundler=vite --compiler=babel --unitTestRunner=vitest --no-interactive`
    );

    const appTestResults = await runCLIAsync(`test ${viteApp}`);
    expect(appTestResults.combinedOutput).toContain(
      'Successfully ran target test'
    );

    const appLintResults = await runCLIAsync(`lint ${viteApp}`);
    expect(appLintResults.combinedOutput).toContain(
      'Successfully ran target lint'
    );

    await runCLIAsync(`build ${viteApp}`);
    checkFilesExist(`dist/apps/${viteApp}/index.html`);
  }, 300_000);

  it('should test and lint app with bundler=vite and compiler=swc', async () => {
    const viteApp = uniq('viteapp');

    runCLI(
      `generate @nx/react:app ${viteApp} --bundler=vite --compiler=swc --unitTestRunner=vitest --no-interactive`
    );

    const appTestResults = await runCLIAsync(`test ${viteApp}`);
    expect(appTestResults.combinedOutput).toContain(
      'Successfully ran target test'
    );

    const appLintResults = await runCLIAsync(`lint ${viteApp}`);
    expect(appLintResults.combinedOutput).toContain(
      'Successfully ran target lint'
    );

    await runCLIAsync(`build ${viteApp}`);
    checkFilesExist(`dist/apps/${viteApp}/index.html`);
  }, 300_000);

  it('should test and lint app with bundler=vite and inSourceTests', async () => {
    const viteApp = uniq('viteapp');
    const viteLib = uniq('vitelib');

    runCLI(
      `generate @nx/react:app ${viteApp} --bundler=vite --unitTestRunner=vitest --inSourceTests --no-interactive`
    );
    expect(() => {
      checkFilesExist(`apps/${viteApp}/src/app/app.spec.tsx`);
    }).toThrow();

    const appTestResults = await runCLIAsync(`test ${viteApp}`);
    expect(appTestResults.combinedOutput).toContain(
      'Successfully ran target test'
    );

    const appLintResults = await runCLIAsync(`lint ${viteApp}`);
    expect(appLintResults.combinedOutput).toContain(
      'Successfully ran target lint'
    );

    await runCLIAsync(`build ${viteApp}`);
    checkFilesExist(`dist/apps/${viteApp}/index.html`);

    runCLI(
      `generate @nx/react:lib ${viteLib} --bundler=vite --inSourceTests --unitTestRunner=vitest --no-interactive`
    );
    expect(() => {
      checkFilesExist(`libs/${viteLib}/src/lib/${viteLib}.spec.tsx`);
    }).toThrow();

    runCLI(
      `generate @nx/react:component comp1 --inSourceTests --export --project=${viteLib} --no-interactive`
    );
    expect(() => {
      checkFilesExist(`libs/${viteLib}/src/lib/comp1/comp1.spec.tsx`);
    }).toThrow();

    runCLI(
      `generate @nx/react:component comp2 --export --project=${viteLib} --no-interactive`
    );
    checkFilesExist(`libs/${viteLib}/src/lib/comp2/comp2.spec.tsx`);

    const libTestResults = await runCLIAsync(`test ${viteLib}`);
    expect(libTestResults.combinedOutput).toContain(
      'Successfully ran target test'
    );

    const libLintResults = await runCLIAsync(`lint ${viteLib}`);
    expect(libLintResults.combinedOutput).toContain(
      'Successfully ran target lint'
    );

    await runCLIAsync(`build ${viteLib}`);
    checkFilesExist(
      `dist/libs/${viteLib}/index.d.ts`,
      `dist/libs/${viteLib}/index.js`,
      `dist/libs/${viteLib}/index.mjs`
    );
  }, 300_000);

  it('should support bundling with Vite', async () => {
    const viteLib = uniq('vitelib');

    runCLI(
      `generate @nx/react:lib ${viteLib} --bundler=vite --no-interactive --unit-test-runner=none`
    );

    await runCLIAsync(`build ${viteLib}`);

    checkFilesExist(
      `dist/libs/${viteLib}/index.d.ts`,
      `dist/libs/${viteLib}/index.js`,
      `dist/libs/${viteLib}/index.mjs`
    );

    // Convert non-buildable lib to buildable one
    const nonBuildableLib = uniq('nonbuildablelib');
    runCLI(
      `generate @nx/react:lib ${nonBuildableLib} --no-interactive --unitTestRunner=jest`
    );
    runCLI(
      `generate @nx/vite:configuration ${nonBuildableLib} --uiFramework=react --no-interactive`
    );
    await runCLIAsync(`build ${nonBuildableLib}`);
    checkFilesExist(
      `dist/libs/${nonBuildableLib}/index.d.ts`,
      `dist/libs/${nonBuildableLib}/index.js`,
      `dist/libs/${nonBuildableLib}/index.mjs`
    );
  }, 300_000);

  it('should support bundling with Vite and Jest', async () => {
    const viteApp = uniq('viteapp');

    runCLI(
      `generate @nx/react:app ${viteApp} --bundler=vite --unitTestRunner=jest --no-interactive`
    );

    const appTestResults = await runCLIAsync(`test ${viteApp}`);
    expect(appTestResults.combinedOutput).toContain(
      'Successfully ran target test'
    );

    await runCLIAsync(`build ${viteApp}`);
    checkFilesExist(`dist/apps/${viteApp}/index.html`);
  }, 300_000);
});
