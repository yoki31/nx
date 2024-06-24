---
title: Overview of the Nx Remix Plugin
description: The Nx Plugin for Remix contains executors, generators, and utilities for managing Remix applications and libraries within an Nx workspace.
---

The Nx Plugin for Remix contains executors, generators, and utilities for managing Remix applications and libraries
within an Nx workspace. It provides:

- Integration with libraries such as Storybook, Jest, Vitest and Cypress.
- Generators to help scaffold code quickly, including:
  - Libraries, both internal to your codebase and publishable to npm
  - Routes
  - Loaders
  - Actions
  - Meta
- Utilities for automatic workspace refactoring.

## Setting up @nx/remix

### Installation

{% callout type="note" title="Keep Nx Package Versions In Sync" %}
Make sure to install the `@nx/remix` version that matches the version of `nx` in your repository. If the version numbers get out of sync, you can encounter some difficult to debug errors. You can [fix Nx version mismatches with this recipe](/recipes/tips-n-tricks/keep-nx-versions-in-sync).
{% /callout %}

In any Nx workspace, you can install `@nx/remix` by running the following command:

{% tabs %}
{% tab label="Nx 18+" %}

```shell {% skipRescope=true %}
nx add @nx/remix
```

This will install the correct version of `@nx/remix`.

### How @nx/remix Infers Tasks

The `@nx/remix` plugin will create a task for any project that has a Remix configuration file present. Any of the following files will be recognized as a Remix configuration file:

- `remix.config.js`
- `remix.config.mjs`
- `remix.config.cjs`

### View Inferred Tasks

To view inferred tasks for a project, open the [project details view](/concepts/inferred-tasks) in Nx Console or run `nx show project my-project --web` in the command line.

### @nx/remix Configuration

The `@nx/remix/plugin` is configured in the `plugins` array in `nx.json`.

```json {% fileName="nx.json" %}
{
  "plugins": [
    {
      "plugin": "@nx/remix/plugin",
      "options": {
        "buildTargetName": "build",
        "serveTargetName": "serve",
        "startTargetName": "start",
        "typecheckTargetName": "typecheck"
      }
    }
  ]
}
```

The `buildTargetName`, `serveTargetName`, `startTargetName` and `typecheckTargetName` options control the names of the inferred Remix tasks. The default names are `build`, `serve`, `start` and `typecheck`.

{% /tab %}
{% tab label="Nx < 18" %}

Install the `@nx/remix` package with your package manager.

```shell
npm add -D @nx/remix
```

{% /tab %}
{% /tabs %}

## Using the Remix Plugin

## Generate a Remix Application

{% callout type="note" title="Directory Flag Behavior Changes" %}
The command below uses the `as-provided` directory flag behavior, which is the default in Nx 16.8.0. If you're on an earlier version of Nx or using the `derived` option, omit the `--directory` flag. See the [as-provided vs. derived documentation](/deprecated/as-provided-vs-derived) for more details.
{% /callout %}

```{% command="nx g @nx/remix:app myapp --directory=apps/myapp" path="~/acme" %}
NX  Generating @nx/remix:application

✔ What unit test runner should be used? · vitest

CREATE apps/myapp/project.json
UPDATE package.json
CREATE apps/myapp/README.md
CREATE apps/myapp/app/root.tsx
CREATE apps/myapp/app/routes/_index.tsx
CREATE apps/myapp/public/favicon.ico
CREATE apps/myapp/remix.config.js
CREATE apps/myapp/remix.env.d.ts
CREATE apps/myapp/tsconfig.json
CREATE apps/myapp/.gitignore
CREATE apps/myapp/package.json
UPDATE nx.json
CREATE tsconfig.base.json
CREATE .prettierrc
CREATE .prettierignore
UPDATE .vscode/extensions.json
CREATE apps/myapp/vite.config.ts
CREATE apps/myapp/tsconfig.spec.json
CREATE apps/myapp/test-setup.ts
CREATE apps/myapp-e2e/cypress.config.ts
CREATE apps/myapp-e2e/src/e2e/app.cy.ts
CREATE apps/myapp-e2e/src/fixtures/example.json
CREATE apps/myapp-e2e/src/support/commands.ts
CREATE apps/myapp-e2e/src/support/e2e.ts
CREATE apps/myapp-e2e/tsconfig.json
CREATE apps/myapp-e2e/project.json
CREATE .eslintrc.json
CREATE .eslintignore
CREATE apps/myapp-e2e/.eslintrc.json
```

## Build, Serve and Test your Application

1. To build your application run:

```{% command="nx build myapp" path="~/acme" %}
> nx run myapp:build

Building Remix app in production mode...

Built in 857ms

——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

NX   Successfully ran target build for project myapp (3s)
```

2. To serve your application for use during development run:

```{% command="nx serve myapp" path="~/acme" %}
> nx run myapp:serve

💿 Building...
💿 Rebuilt in 377ms
Remix App Server started at http://localhost:3000 (http://192.168.0.14:3000)
```

3. To test the application using vitest run:

```{% command="nx test myapp" path="~/acme" %}
> nx run myapp:test

RUN  v0.31.4 /Users/columferry/dev/nrwl/issues/remixguide/acme/apps/myapp
stderr | app/routes/index.spec.ts > test > should render
Warning: Functions are not valid as a React child. This may happen if you return a Component instead of <Component /> from render. Or maybe you meant to call this function rather than return it.
✓ app/routes/index.spec.ts  (1 test) 10ms
Test Files  1 passed (1)
     Tests  1 passed (1)
Start at  16:15:45
Duration  1.20s (transform 51ms, setup 139ms, collect 180ms, tests 10ms, environment 379ms, prepare 103ms)

——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

NX   Successfully ran target test for project myapp (2s)
```

## Generating an Nx Library

When developing your application, it often makes sense to split your codebase into smaller more focused libraries.

To generate a library to use in your Remix application run:

```{% command="nx g @nx/remix:lib login --directory=libs/login" path="~/acme" %}
NX  Generating @nx/remix:library

✔ What test runner should be used? · vitest
UPDATE nx.json
UPDATE package.json
CREATE babel.config.json
CREATE libs/login/project.json
CREATE libs/login/.eslintrc.json
CREATE libs/login/README.md
CREATE libs/login/src/index.ts
CREATE libs/login/tsconfig.lib.json
CREATE libs/login/tsconfig.json
CREATE libs/login/vite.config.ts
CREATE libs/login/tsconfig.spec.json
CREATE libs/login/src/lib/login.module.css
CREATE libs/login/src/lib/login.spec.tsx
CREATE libs/login/src/lib/login.tsx
UPDATE tsconfig.base.json
CREATE libs/login/src/test-setup.ts
CREATE libs/login/src/server.ts
```

You can then use the library by importing one of the exports into your application:

`apps/myapp/app/routes/index.tsx`

```tsx
import { Login } from '@acme/login';

export default function Index() {
  return (
    <div>
      <Login />
    </div>
  );
}
```

You can also run test on your library:

`nx test login`

## Generating a Route

To generate a route for your application:

```{% command="nx g @nx/remix:route admin --path=apps/myapp/app/routes" path="~/acme" %}
NX  Generating @nx/remix:route

CREATE apps/myapp/app/routes/admin.tsx
CREATE apps/myapp/app/styles/admin.css
```

## Using a loader from your Library

To use a Route Loader where the logic lives in your library, follow the steps below.

1. Generate a loader for your route:

```{% command="nx g @nx/remix:loader admin --path=apps/myapp/app/routes" path="~/acme" %}
NX  Generating @nx/remix:loader

UPDATE apps/myapp/app/routes/admin.tsx
```

2. Add a new file in your `login` lib

`libs/login/src/lib/admin/admin.loader.ts`

```ts
import { json, LoaderFunctionArgs } from '@remix-run/node';

export const adminLoader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    message: 'Hello, world!',
  });
};
```

Export the function from the `libs/login/src/server.ts` file:

```ts
export * from './lib/admin/admin.loader';
```

3. Use the loader in your `apps/myapp/app/routes/admin.tsx`

Replace the default loader code:

```tsx
export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    message: 'Hello, world!',
  });
};
```

with

```tsx
import { adminLoader } from '@acme/login/server';

export const loader = adminLoader;
```

## GitHub Repository with Example

You can see an example of an Nx Workspace using Remix by clicking below.

{% github-repository url="https://github.com/nrwl/nx-recipes/tree/main/remix" /%}
