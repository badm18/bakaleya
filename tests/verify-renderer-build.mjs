import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const assetsDir = resolve('dist/electron/UnPackaged/assets');
const scripts = readdirSync(assetsDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => join(assetsDir, name));

if (scripts.length === 0) {
  throw new Error(`No renderer JavaScript found in ${assetsDir}`);
}

let failures = 0;
for (const script of scripts) {
  const result = spawnSync(process.execPath, ['--check', script], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures += 1;
    const error = result.stderr.match(/SyntaxError:[^\r\n]*/)?.[0]
      ?? result.error?.message
      ?? `node --check exited with ${result.status}`;
    console.error(`${script}: ${error}`);
  }
}

if (failures > 0) {
  throw new Error(`${failures} of ${scripts.length} renderer scripts contain invalid JavaScript`);
}

console.log(`Checked ${scripts.length} renderer scripts`);
