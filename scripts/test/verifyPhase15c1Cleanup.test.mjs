import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  findUnintendedBackendPathReferences,
  verifyPhase15c1Cleanup,
} from '../lib/phase15c1Cleanup.mjs';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

test('Phase 15C.1 cleanup verification works when rg is absent', () => {
  const emptyPath = fs.mkdtempSync(path.join(os.tmpdir(), 'ghostbridge-no-tools-'));
  const originalPath = process.env.PATH;
  const originalWindowsPath = process.env.Path;
  try {
    process.env.PATH = emptyPath;
    if (process.platform === 'win32') process.env.Path = emptyPath;
    assert.doesNotThrow(() => verifyPhase15c1Cleanup(root));
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    if (originalWindowsPath === undefined) delete process.env.Path;
    else process.env.Path = originalWindowsPath;
    fs.rmSync(emptyPath, { recursive: true, force: true });
  }
});

test('cleanup source scan reports an uppercase backend path reference', () => {
  const repository = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ghostbridge-cleanup-scan-'),
  );
  try {
    fs.mkdirSync(path.join(repository, 'scripts'));
    fs.writeFileSync(
      path.join(repository, 'scripts', 'fixture.mjs'),
      `export const stale = '${'Back'}${'end'}/src/index.js';\n`,
      'utf8',
    );
    assert.deepEqual(findUnintendedBackendPathReferences(repository), [
      { path: 'scripts/fixture.mjs', line: 1 },
    ]);
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
  }
});
