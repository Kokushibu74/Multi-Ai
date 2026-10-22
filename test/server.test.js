'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('server defines security headers, JSON body limit, and rate limiting', () => {
  assert.match(source, /X-Content-Type-Options/);
  assert.match(source, /express\.json\(\{ limit: '64kb'/);
  assert.match(source, /rateLimit/);
});

test('server keeps credentials in backend environment variables', () => {
  assert.match(source, /process\.env\.GITHUB_TOKEN/);
  assert.match(source, /Never ask users to paste secrets into chat/);
});
