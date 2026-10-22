'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'web-search.js'), 'utf8');

test('web retrieval uses a fixed public provider endpoint', () => {
  assert.match(source, /api\.duckduckgo\.com/);
  assert.doesNotMatch(source, /req\.query\.url|fetch\(req\.query/);
});

test('web retrieval bounds query length, times out, and explains limitations', () => {
  assert.match(source, /slice\(0, 200\)/);
  assert.match(source, /AbortController/);
  assert.match(source, /not a complete search engine index/);
});
