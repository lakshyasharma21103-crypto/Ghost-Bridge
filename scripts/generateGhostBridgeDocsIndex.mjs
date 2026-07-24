import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateLlmsFullText,
  generateLlmsText,
  validateDocumentationManifest,
} from '../frontend/src/docs/docsEngine.js';
import { docsManifest } from '../frontend/src/docs/docsManifest.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDirectory = path.join(root, 'frontend', 'public');

validateDocumentationManifest(docsManifest);
fs.mkdirSync(publicDirectory, { recursive: true });

const llms = generateLlmsText(docsManifest);
const llmsFull = generateLlmsFullText(docsManifest);
fs.writeFileSync(path.join(publicDirectory, 'llms.txt'), llms, 'utf8');
fs.writeFileSync(path.join(publicDirectory, 'llms-full.txt'), llmsFull, 'utf8');

process.stdout.write(
  `Generated llms.txt and llms-full.txt for ${docsManifest.length} public pages.\n`,
);
