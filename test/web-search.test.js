'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('web retrieval uses a fixed public provider endpoint', () => {
  const source = fs.readFileSync(require.resolve('../web-search'), 'utf8');
  assert.match(source, /api\.duckduckgo\.com/);
  assert.doesNotMatch(source, /req\.query\.url|fetch\(req\.query/);
});

test('web retrieval bounds query length and has a timeout', () => {
  const source = fs.readFileSync(require.resolve('../web-search'), 'utf8');
  assert.match(source, /slice\(0, 200\)/);
  assert.match(source, /AbortController/);
  assert.match(source, /untrusted external content/);
});
