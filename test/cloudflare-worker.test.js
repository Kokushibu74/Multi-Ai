'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'cloudflare-worker.js'), 'utf8');

test('Cloudflare Worker exposes the production health and D1 memory contract', () => {
  assert.match(source, /path==='\/health'/);
  assert.match(source, /memoryConfigured:!!env\.DB/);
  assert.match(source, /memoryLimitPerClient:100/);
  assert.match(source, /env\.DB\.prepare/);
});

test('Cloudflare Worker retries only idempotent GET and HEAD requests', () => {
  assert.match(source, /async function fetchGetWithRetry/);
  assert.match(source, /method!==\"GET\"&&method!==\"HEAD\"/);
  assert.match(source, /maxAttempts=2/);
  assert.match(source, /\[408,425,429,500,502,503,504\]/);
});

test('Cloudflare Worker bounds provider calls and logs sanitized fallback failures', () => {
  assert.match(source, /AbortSignal\.timeout\(12000\)/);
  assert.match(source, /Multi-AI provider fallback exhausted:/);
  assert.match(source, /Bearer \[redacted\]/);
});

test('Cloudflare Worker retains request limits and low-cost image generation', () => {
  assert.match(source, /rateLimit\(ip,bucket,max\)/);
  assert.match(source, /contentLength>65536/);
  assert.match(source, /steps:4/);
});

console.log('Cloudflare Worker production contracts OK.');
