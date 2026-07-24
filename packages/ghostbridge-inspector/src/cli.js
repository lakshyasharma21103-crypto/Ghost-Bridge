#!/usr/bin/env node
'use strict';

const { startInspectorUi } = require('./index');

const args = new Set(process.argv.slice(2));
const valueAfter = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
};

const baseUrl = valueAfter('--target', 'http://127.0.0.1:8787');
const allowUnsafeRemote = args.has('--unsafe-allow-remote');
const unsafeAcknowledged = args.has('--i-understand-risk');

if (allowUnsafeRemote) {
  process.stderr.write(
    'WARNING: unsafe remote Inspector mode may send protocol requests to an untrusted target.\n',
  );
}

startInspectorUi({
  baseUrl,
  allowUnsafeRemote,
  unsafeAcknowledged,
  port: Number(valueAfter('--port', '6277')),
})
  .then(({ address }) => {
    process.stdout.write(
      `Ghost Bridge Inspector listening at http://127.0.0.1:${address.port}\n`,
    );
  })
  .catch((error) => {
    process.stderr.write(`${error?.code || 'INSPECTOR_START_FAILED'}: ${error.message}\n`);
    process.exitCode = 1;
  });

