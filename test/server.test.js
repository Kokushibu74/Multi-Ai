'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('server defines security headers and JSON body limit', () => {
  const source = fs.readFileSync(require.resolve('../server'), 'utf8');
  assert.match(source, /X-Content-Type-Options/);
  assert.match(source, /express\.json\(\{ limit: '64kb'/);
  assert.match(source, /rateLimit/);
});

test('server never places provider secrets in the frontend system', () => {
  const source = fs.readFileSync(require.resolve('../server'), 'utf8');
  assert.match(source, /process\.env\.GITHUB_TOKEN/);
  assert.match(source, /Never ask users to paste secrets into chat/);
});
