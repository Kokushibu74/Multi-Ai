import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const htmlPath = new URL('../index.html', import.meta.url);
const html = readFileSync(fileURLToPath(htmlPath), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)];

if (scripts.length === 0) {
  throw new Error('No inline script blocks found in index.html');
}

scripts.forEach((match, index) => {
  const code = match[1];
  if (code.trim()) new vm.Script(code, { filename: `index.html:inline-script-${index + 1}` });
});

console.log(`Syntax check passed for ${scripts.length} inline script block(s).`);
