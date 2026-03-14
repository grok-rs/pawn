#!/usr/bin/env node

/**
 * Locale drift checker — detects missing/extra keys between translation files.
 * Reference locale: en. Compared locales: ru, ua.
 *
 * Usage:
 *   node scripts/check-locales.mjs          # check only
 *   node scripts/check-locales.mjs --fix    # check + remove extra keys not in EN
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = resolve(__dirname, '../src/locales');
const FIX_MODE = process.argv.includes('--fix');

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flatten(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function unflatten(flat) {
  const result = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

function loadLocale(lang) {
  const filePath = resolve(localesDir, lang, 'translation.json');
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function saveLocale(lang, data) {
  const filePath = resolve(localesDir, lang, 'translation.json');
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

// Load reference locale
const enData = loadLocale('en');
const enFlat = flatten(enData);
const enKeys = new Set(Object.keys(enFlat));

let hasErrors = false;
const comparedLocales = ['ru', 'ua'];

for (const lang of comparedLocales) {
  const langData = loadLocale(lang);
  const langFlat = flatten(langData);
  const langKeys = new Set(Object.keys(langFlat));

  const missing = [...enKeys].filter(k => !langKeys.has(k)).sort();
  const extra = [...langKeys].filter(k => !enKeys.has(k)).sort();

  if (missing.length === 0 && extra.length === 0) {
    console.log(`\x1b[32m${lang}: in sync (${langKeys.size} keys)\x1b[0m`);
    continue;
  }

  hasErrors = true;

  if (missing.length > 0) {
    console.log(`\x1b[31m${lang}: ${missing.length} missing keys\x1b[0m`);
    for (const key of missing) {
      console.log(`  \x1b[33m+ ${key}\x1b[0m = ${JSON.stringify(enFlat[key]).slice(0, 80)}`);
    }
  }

  if (extra.length > 0) {
    console.log(`\x1b[31m${lang}: ${extra.length} extra keys (not in en)\x1b[0m`);
    for (const key of extra) {
      console.log(`  \x1b[90m- ${key}\x1b[0m`);
    }
  }

  if (FIX_MODE && extra.length > 0) {
    const mergedFlat = { ...langFlat };

    // Remove extra keys only
    for (const key of extra) {
      delete mergedFlat[key];
    }

    // Sort keys to match EN order
    const sortedFlat = {};
    for (const key of Object.keys(enFlat)) {
      if (key in mergedFlat) {
        sortedFlat[key] = mergedFlat[key];
      }
    }

    saveLocale(lang, unflatten(sortedFlat));
    console.log(`\x1b[36m${lang}: removed ${extra.length} extra keys\x1b[0m`);
  }
}

if (hasErrors) {
  if (!FIX_MODE) {
    console.log('\nRun with --fix to remove extra keys.');
  }
  console.log('Missing keys must be translated manually.');
  process.exit(1);
}
