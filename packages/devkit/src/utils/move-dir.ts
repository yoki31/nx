import { relative } from 'path';
import { visitNotIgnoredFiles } from '../generators/visit-not-ignored-files';

import { normalizePath, Tree } from 'nx/src/devkit-exports';

/**
 * Analogous to cp -r oldDir newDir
 */
export function moveFilesToNewDirectory(
  tree: Tree,
  oldDir: string,
  newDir: string
): void {
  oldDir = normalizePath(oldDir);
  newDir = normalizePath(newDir);
  visitNotIgnoredFiles(tree, oldDir, (file) => {
    try {
      tree.rename(file, `${newDir}/${relative(oldDir, file)}`);
    } catch (e) {
      if (!tree.exists(oldDir)) {
        console.warn(`Path ${oldDir} does not exist`);
      } else if (!tree.exists(newDir)) {
        console.warn(`Path ${newDir} does not exist`);
      }
    }
  });
}
