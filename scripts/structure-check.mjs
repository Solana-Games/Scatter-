import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const required = ['apps', 'packages', 'prisma', 'infra'];
try {
  const existing = new Set(readdirSync(repoRoot));
  for (const folder of required) {
    if (!existing.has(folder)) {
      throw new Error(`Missing required folder: ${folder}`);
    }
  }
  console.log('Structure check passed.');
} catch (err) {
  console.error(`Structure check failed: ${err.message}`);
  process.exit(1);
}