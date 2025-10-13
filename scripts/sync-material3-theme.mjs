#!/usr/bin/env node
import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const [,, sourceDirArg] = process.argv;
if (!sourceDirArg) {
  console.error('Usage: node scripts/sync-material3-theme.mjs <source-directory>');
  process.exit(1);
}

const sourceDir = path.resolve(process.cwd(), sourceDirArg);
const requiredFiles = [
  'tokens.css',
  'colors.module.css',
  'typography.module.css',
  'theme.css',
  'theme.light.css',
  'theme.dark.css',
];

async function ensureFilesPresent() {
  const missing = [];
  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(sourceDir, file));
    } catch {
      missing.push(file);
    }
  }
  if (missing.length) {
    console.error('Missing expected files in source directory:', missing.join(', '));
    process.exit(1);
  }
}

async function copyThemeFiles() {
  const targetDir = path.join(repoRoot, 'src/styles/material3');
  await fs.mkdir(targetDir, {recursive: true});
  for (const file of requiredFiles) {
    const from = path.join(sourceDir, file);
    const to = path.join(targetDir, file);
    await fs.copyFile(from, to);
    console.log('Copied', file);
  }
  return path.join(targetDir, 'tokens.css');
}

function extractPalettes(tokensCss) {
  const pattern = /--md-ref-palette-(primary|secondary|tertiary|neutral|neutral-variant|error)(\d+):\s*(#[0-9a-fA-F]{6});/g;
  const palettes = {
    primary: {},
    secondary: {},
    tertiary: {},
    neutral: {},
    'neutral-variant': {},
    error: {},
  };
  let match;
  while ((match = pattern.exec(tokensCss))) {
    const [, name, tone, value] = match;
    palettes[name][Number(tone)] = value.toLowerCase();
  }
  return palettes;
}

function buildPaletteBlock(palettes) {
  const toneMap = {
    primary: [0,10,20,25,30,35,40,50,60,70,80,90,95,98,99,100],
    secondary: [0,10,20,25,30,35,40,50,60,70,80,90,95,98,99,100],
    tertiary: [0,10,20,25,30,35,40,50,60,70,80,90,95,98,99,100],
    neutral: [0,4,6,10,12,17,20,22,24,25,30,35,40,50,60,70,80,87,90,92,94,95,96,98,99,100],
    'neutral-variant': [0,10,20,25,30,35,40,50,60,70,80,90,95,98,99,100],
    error: [0,10,20,25,30,35,40,50,60,70,80,90,95,98,99,100],
  };
  const lines = ['$tonal-palettes: ('];
  for (const name of Object.keys(toneMap)) {
    lines.push(`  ${name}: (`);
    for (const tone of toneMap[name]) {
      const value = palettes[name][tone];
      if (!value) {
        throw new Error(`Missing tone ${tone} for palette ${name}`);
      }
      lines.push(`    ${tone}: ${value.toLowerCase()},`);
    }
    lines.push('  ),');
  }
  lines.push(');');
  return lines.join('\n');
}

async function updateThemeColors(tokensPath) {
  const tokensCss = await fs.readFile(tokensPath, 'utf8');
  const palettes = extractPalettes(tokensCss);
  const newBlock = buildPaletteBlock(palettes);
  const targetPath = path.join(repoRoot, '_theme-colors.scss');
  const original = await fs.readFile(targetPath, 'utf8');
  const pattern = new RegExp('\\$tonal-palettes:[\\s\\S]*?\\$_rest:');
  const replaced = original.replace(pattern, `${newBlock}\n\n$_rest:`);
  if (replaced === original) {
    console.log('Tonal palette block already up to date.');
  } else {
    await fs.writeFile(targetPath, replaced);
    console.log('Updated tonal palettes in _theme-colors.scss');
  }
}

(async () => {
  await ensureFilesPresent();
  const tokensPath = await copyThemeFiles();
  await updateThemeColors(tokensPath);
  console.log('Material 3 theme sync complete.');
})();
