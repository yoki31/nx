import { Tree } from 'nx/src/generators/tree';
import { getProjects } from '@nx/devkit';

export function findFreePort(host: Tree) {
  const projects = getProjects(host);
  let port = -Infinity;
  for (const [, p] of projects.entries()) {
    const curr = p.targets?.serve?.options?.port;
    if (typeof curr === 'number') {
      port = Math.max(port, curr);
    }
  }
  return port > 0 ? port + 1 : 4200;
}
