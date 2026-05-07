import { readdirSync } from 'node:fs';

const required = ['apps', 'packages', 'prisma', 'infra'];
for (const folder of required) {
  if (!readdirSync('.').includes(folder)) {
    throw new Error(`Missing required folder: ${folder}`);
  }
}
console.log('Build structure check passed.');
