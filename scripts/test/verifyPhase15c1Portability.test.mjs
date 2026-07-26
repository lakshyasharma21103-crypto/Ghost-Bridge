import assert from 'node:assert/strict';
import test from 'node:test';
import { npmCommandForPlatform } from '../lib/crossPlatformCommands.mjs';

test('Phase 15C.1 package verification selects the platform npm executable', () => {
  assert.equal(npmCommandForPlatform('win32'), 'npm.cmd');
  assert.equal(npmCommandForPlatform('linux'), 'npm');
  assert.equal(npmCommandForPlatform('darwin'), 'npm');
});
