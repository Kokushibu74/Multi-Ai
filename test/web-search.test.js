'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'web-search.js'), 'utf8');

test('search uses public providers and a fixed webpage reader host', () => {
  assert.ok(source.includes('api.duckduckgo.com'));
  assert.ok(source.includes("const readerUrl='https://r.jina.ai/'+target"));
  assert.ok(source.includes('function isPublicWebUrl'));
});

test('web retrieval bounds query length, times out, and explains limitations', () => {
  assert.ok(source.includes('.slice(0, 200)'));
  assert.ok(source.includes('AbortController'));
  assert.ok(source.includes('coverage is limited'));
});

test('webpage reader rejects local and private IPv4 targets', () => {
  assert.ok(source.includes("h==='localhost'"));
  assert.ok(source.includes("h.startsWith('192.168.')"));
  assert.ok(source.includes("h==='169.254.169.254'"));
});
