'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'web-search.js'), 'utf8');

test('search uses public providers and webpage reading uses a fixed reader host', () => {
  assert.match(source, /api\\.duckduckgo\\.com/);
  assert.match(source, /r\\.jina\\.ai\\/\\+target/);
  assert.match(source, /function isPublicWebUrl/);
});

test('web retrieval bounds query length, times out, and explains limitations', () => {
  assert.match(source, /slice\\(0, 200\\)/);
  assert.match(source, /AbortController/);
  assert.match(source, /coverage is limited/);
});

test('webpage reader rejects local and private IPv4 targets', () => {
  assert.match(source, /localhost/);
  assert.match(source, /192\\.168\\./);
  assert.match(source, /169\\.254\\.169\\.254/);
});
