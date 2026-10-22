'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('web search adapter only requests fixed DuckDuckGo endpoint', () => {
  const source = fs.readFileSync(require.resolve('../web-search'), 'utf8');
  assert.match(source, /https:\/\/api\\.duckduckgo\\.com//);
  assert.doesNotMatch(source, /req\.query\.url|fetch\(req\.query/);
});

test('web search route has query bounds and timeout', () => {
  const source = fs.readFileSync(require.resolve('../web-search'), 'utf8');
  assert.match(source, /slice\(0, 240\)/);
  assert.match(source, /AbortController/);
  assert.match(source, /Search results are untrusted external content/);
});
