import { insertStatement } from './insert-statement';
import { applyChangesToString, ChangeType, Tree } from '@nx/devkit';
import type { NamedImports } from 'typescript';
import { ensureTypescript } from '../../utilities/typescript';

let tsModule: typeof import('typescript');

export function insertImport(
  tree: Tree,
  path: string,
  name: string,
  modulePath: string
) {
  if (!tsModule) {
    tsModule = ensureTypescript();
  }
  const {
    createSourceFile,
    ScriptTarget,
    isStringLiteral,
    isImportDeclaration,
    isNamedImports,
  } = tsModule;

  const contents = tree.read(path, 'utf-8');

  const sourceFile = createSourceFile(path, contents, ScriptTarget.ESNext);

  const importStatements = sourceFile.statements.filter(isImportDeclaration);

  const existingImport = importStatements.find(
    (statement) =>
      isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier
        .getText(sourceFile)
        .replace(/['"`]/g, '')
        .trim() === modulePath &&
      statement.importClause.namedBindings &&
      isNamedImports(statement.importClause.namedBindings)
  );
  if (!existingImport) {
    insertStatement(tree, path, `import { ${name} } from '${modulePath}';`);
    return;
  }

  // TODO: Also check if the namedImport already exists
  const namedImports = existingImport.importClause
    .namedBindings as NamedImports;

  const index = namedImports.getEnd() - 1;

  let text: string;
  if (namedImports.elements.hasTrailingComma) {
    text = `${name},`;
  } else {
    text = `,${name}`;
  }

  const newContents = applyChangesToString(contents, [
    {
      type: ChangeType.Insert,
      index,
      text,
    },
  ]);

  tree.write(path, newContents);
}
