'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '.github', 'workflows');
const research = fs.readFileSync(path.join(root, 'research.yml'), 'utf8');
const keepalive = fs.readFileSync(path.join(root, 'render-keepalive.yml'), 'utf8');

test('Research digest retries transient arXiv failures and has a stale-cache fallback', () => {
  assert.match(research, /timeout-minutes: 8/);
  assert.match(research, /actions\/cache\/restore@v4/);
  assert.match(research, /actions\/cache\/save@v4/);
  assert.match(research, /for attempt in range\(3\)/);
  assert.match(research, /timeout=25/);
  assert.match(research, /last successful cached digest/);
  assert.match(research, /actions\/upload-artifact@v4/);
});

test('Render keepalive retries with a bounded timeout and rejects server errors', () => {
  assert.match(keepalive, /timeout-minutes: 3/);
  assert.match(keepalive, /for attempt in 1 2 3/);
  assert.match(keepalive, /--max-time 35/);
  assert.match(keepalive, /5\?\?/);
  assert.match(keepalive, /cancel-in-progress: true/);
});

console.log('Workflow retry, cache fallback, and timeout contracts OK.');
