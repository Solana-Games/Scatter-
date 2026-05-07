import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (!pkg.name || !pkg.scripts?.test) {
  throw new Error('package.json is missing required metadata/scripts');
}
console.log('Metadata check passed.');
