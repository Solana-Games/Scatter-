import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const packagePath = path.join(repoRoot, 'package.json');

try {
  const content = readFileSync(packagePath, 'utf8');
  const pkg = JSON.parse(content);
  if (!pkg.name || typeof pkg.name !== 'string') {
    throw new Error('package.json missing "name" field (must be a non-empty string)');
  }
  if (!pkg.scripts?.test) {
    throw new Error('package.json missing "scripts.test" field');
  }
  console.log('Metadata check passed.');
} catch (err) {
  console.error(`Metadata check failed: ${err.message}`);
  process.exit(1);
}