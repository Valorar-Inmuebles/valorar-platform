import * as fs from 'node:fs';
import * as path from 'node:path';

export function resolveRepoRoot(startDir = process.cwd()): string {
  let dir = path.resolve(startDir);

  for (;;) {
    const packageJsonPath = path.join(dir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const raw = fs.readFileSync(packageJsonPath, 'utf8');
      const parsed = JSON.parse(raw) as { workspaces?: unknown; name?: string };
      if (parsed.workspaces || parsed.name === 'valorar-platform') {
        return dir;
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  throw new Error(
    'Could not resolve the valorar-platform workspace root from ' + startDir,
  );
}

export function resolveSourcePath(
  sourcePath: string | undefined,
  repoRoot = resolveRepoRoot(),
): string {
  if (!sourcePath) {
    return path.join(repoRoot, 'migration-data', 'emprendimientos');
  }

  return path.isAbsolute(sourcePath)
    ? sourcePath
    : path.resolve(repoRoot, sourcePath);
}
