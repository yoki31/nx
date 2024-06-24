// TODO(jack): Remove inline renderHook function when RTL releases with its own version
import {
  applyChangesToString,
  formatFiles,
  generateFiles,
  getProjects,
  joinPathFragments,
  logger,
  names,
  toJS,
  Tree,
} from '@nx/devkit';

import { Schema } from './schema';
import { addImport } from '../../utils/ast-utils';
import { ensureTypescript } from '@nx/js/src/utils/typescript/ensure-typescript';
import { join } from 'path';
import { determineArtifactNameAndDirectoryOptions } from '@nx/devkit/src/generators/artifact-name-and-directory-utils';

interface NormalizedSchema extends Schema {
  projectSourceRoot: string;
  hookName: string;
  hookTypeName: string;
  fileName: string;
  projectName: string;
}

export async function hookGenerator(host: Tree, schema: Schema) {
  return hookGeneratorInternal(host, {
    nameAndDirectoryFormat: 'derived',
    ...schema,
  });
}

export async function hookGeneratorInternal(host: Tree, schema: Schema) {
  const options = await normalizeOptions(host, schema);

  createFiles(host, options);
  addExportsToBarrel(host, options);

  return await formatFiles(host);
}

function createFiles(host: Tree, options: NormalizedSchema) {
  generateFiles(host, join(__dirname, './files'), options.directory, {
    ...options,
    tmpl: '',
  });

  for (const c of host.listChanges()) {
    let deleteFile = false;

    if (options.skipTests && /.*spec.ts/.test(c.path)) {
      deleteFile = true;
    }

    if (deleteFile) {
      host.delete(c.path);
    }
  }

  if (options.js) {
    toJS(host);
  }
}

let tsModule: typeof import('typescript');

function addExportsToBarrel(host: Tree, options: NormalizedSchema) {
  if (!tsModule) {
    tsModule = ensureTypescript();
  }
  const workspace = getProjects(host);
  const isApp =
    workspace.get(options.projectName).projectType === 'application';

  if (options.export && !isApp) {
    const indexFilePath = joinPathFragments(
      options.projectSourceRoot,
      options.js ? 'index.js' : 'index.ts'
    );
    const indexSource = host.read(indexFilePath, 'utf-8');
    if (indexSource !== null) {
      const indexSourceFile = tsModule.createSourceFile(
        indexFilePath,
        indexSource,
        tsModule.ScriptTarget.Latest,
        true
      );
      const changes = applyChangesToString(
        indexSource,
        addImport(
          indexSourceFile,
          `export * from './${options.directory}/${options.fileName}';`
        )
      );
      host.write(indexFilePath, changes);
    }
  }
}

async function normalizeOptions(
  host: Tree,
  options: Schema
): Promise<NormalizedSchema> {
  assertValidOptions(options);

  const {
    artifactName: name,
    directory: _directory,
    fileName: _fileName,
    nameAndDirectoryFormat,
    project: projectName,
  } = await determineArtifactNameAndDirectoryOptions(host, {
    artifactType: 'hook',
    callingGenerator: '@nx/react:hook',
    name: options.name,
    directory: options.directory,
    derivedDirectory: options.directory,
    flat: options.flat,
    nameAndDirectoryFormat: options.nameAndDirectoryFormat,
    project: options.project,
    fileExtension: 'tsx',
    pascalCaseFile: options.pascalCaseFiles,
    pascalCaseDirectory: options.pascalCaseDirectory,
  });

  let base = _fileName;
  if (base.startsWith('use-')) {
    base = base.substring(4);
  } else if (base.startsWith('use')) {
    base = base.substring(3);
  }

  const { className, fileName } = names(base);
  // If using `as-provided` file and directory, then don't normalize.
  // Otherwise, support legacy behavior of prefixing filename with `use-`.
  const hookFilename =
    nameAndDirectoryFormat === 'as-provided'
      ? fileName
      : options.pascalCaseFiles
      ? 'use'.concat(className)
      : 'use-'.concat(fileName);
  const hookName = 'use'.concat(className);
  const hookTypeName = 'Use'.concat(className);
  const project = getProjects(host).get(projectName);

  const { sourceRoot: projectSourceRoot, projectType } = project;

  if (options.export && projectType === 'application') {
    logger.warn(
      `The "--export" option should not be used with applications and will do nothing.`
    );
  }

  // Support legacy behavior of derived directory to prefix with `use-`.
  let directory = _directory;
  if (nameAndDirectoryFormat === 'derived') {
    const parts = directory.split('/');
    parts.pop();
    if (!options.flat) {
      parts.push(
        options.pascalCaseDirectory
          ? 'use'.concat(className)
          : 'use-'.concat(fileName)
      );
    }
    directory = parts.join('/');
  }

  return {
    ...options,
    directory,
    hookName,
    hookTypeName,
    fileName: hookFilename,
    projectSourceRoot,
    projectName,
  };
}

function assertValidOptions(options: Schema) {
  const slashes = ['/', '\\'];
  slashes.forEach((s) => {
    if (options.name.indexOf(s) !== -1) {
      const [name, ...rest] = options.name.split(s).reverse();
      let suggestion = rest.map((x) => x.toLowerCase()).join(s);
      if (options.directory) {
        suggestion = `${options.directory}${s}${suggestion}`;
      }
      throw new Error(
        `Found "${s}" in the hook name. Did you mean to use the --directory option (e.g. \`nx g c ${name} --directory ${suggestion}\`)?`
      );
    }
  });
}

export default hookGenerator;
