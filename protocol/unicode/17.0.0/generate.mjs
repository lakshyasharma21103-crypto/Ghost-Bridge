import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  artifactBuffers,
  buildRepositoryArtifacts,
  checkRepository,
  sha256,
} from './lib/unicode-data.mjs';

const foundationRoot = path.dirname(fileURLToPath(import.meta.url));

function fail(message) {
  throw new Error(message);
}

function resolveInsideFoundation(relativePath) {
  const absolute = path.resolve(foundationRoot, relativePath);
  if (!absolute.startsWith(`${foundationRoot}${path.sep}`))
    fail(`Generated path escapes foundation: ${relativePath}`);
  return absolute;
}

async function writeGeneratedArtifacts() {
  const { artifacts } = await buildRepositoryArtifacts(foundationRoot);
  const buffers = artifactBuffers(artifacts);
  const results = [];
  for (const [relativePath, bytes] of [...buffers].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    const absolute = resolveInsideFoundation(relativePath);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes);
    results.push({ path: relativePath, byteLength: bytes.byteLength, sha256: sha256(bytes) });
  }
  return results;
}

async function main() {
  const mode = process.argv[2] ?? '--check';
  if (process.argv.length > 3 || !new Set(['--check', '--write']).has(mode)) {
    fail('Usage: node generate.mjs [--check|--write]');
  }
  if (mode === '--write') {
    const generated = await writeGeneratedArtifacts();
    console.log('UNICODE17_GENERATION WRITE');
    for (const entry of generated)
      console.log(`${entry.sha256}  ${entry.byteLength}  ${entry.path}`);
    console.log('UNICODE17_MANIFEST_UPDATE_REQUIRED_AFTER_WRITE');
    return;
  }
  const result = await checkRepository(foundationRoot);
  console.log(`UNICODE17_SOURCE_FILES PASS ${result.sourceFiles}`);
  console.log(`UNICODE17_SOURCE_SET_SHA256 PASS ${result.sourceSetSha256}`);
  console.log(`UNICODE17_GENERATED_FILES PASS ${result.generatedFiles}`);
  for (const entry of result.generated)
    console.log(`${entry.sha256}  ${entry.byteLength}  ${entry.path}`);
  console.log(`UNICODE17_OFFLINE_IMPLEMENTATION PASS ${result.offlineFiles}`);
  console.log('D2_01R1_UNICODE17_SOURCE_FOUNDATION PASS');
}

main().catch((error) => {
  console.error(`D2_01R1_UNICODE17_SOURCE_FOUNDATION FAIL: ${error.message}`);
  process.exitCode = 1;
});
