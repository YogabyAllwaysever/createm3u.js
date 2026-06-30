#!/usr/bin/env node

// createm3u.js
// Usage:
//   node createm3u.js "/path/to/folder" [--music] [--seriesvideo] [--anime] [--output name.m3u] [--watch] [--verbose] [--v] [--about]
// Examples:
//   node createm3u.js "/storage/emulated/0/music/spotify/" --music --output playlist.m3u
//   node createm3u.js "/storage/video/series" --seriesvideo -o series.m3u --watch
//   node createm3u.js "/storage/anime" --anime -o anime.m3u
//   node createm3u.js --v
//   node createm3u.js --about

const fs = require('fs');
const path = require('path');

// ========== VERSION AND ABOUT ==========
const VERSION = '1.3.0';
const ABOUT = `
createm3u.js - M3U playlist generator
Version: ${VERSION}

Purpose:
  Recursively scan a directory and generate an M3U playlist file
  in extended format (#EXTM3U and #EXTINF).

Modes:
  --music          : include only audio files (mp3, flac, etc.)
  --seriesvideo    : include only video files and sort by episode number
  --anime          : include only video files, sort episodes first, then NCOP, then NCED
  (no mode)        : include all media (audio + video)

Options:
  --output, -o <name>   : specify output file name (default: playlist.m3u in source directory)
  --watch               : watch directory for changes and auto-regenerate playlist
  --verbose             : show detailed logs (each file scanned)
  --v, --version        : show version
  --about               : show information about this script

M3U format:
  Each entry is written as:
    #EXTINF:-1,<filename without extension>
    <relative path from base directory>

License: MIT
https://github.com/YogabyAllwaysever/createm3u.js
`;

// ========== HELPER FOR FORMATTING MESSAGES ==========
function formatMessage(msg, ...args) {
  for (let i = 0; i < args.length; i++) {
    msg = msg.replace('%s', args[i]);
  }
  return msg;
}

let verbose = false;

function logInfo(msg, ...args) {
  console.log(formatMessage(msg, ...args));
}

function logVerbose(msg, ...args) {
  if (verbose) {
    console.log(formatMessage(msg, ...args));
  }
}

function logWarn(msg, ...args) {
  console.warn(formatMessage(msg, ...args));
}

function logError(msg, ...args) {
  console.error(formatMessage(msg, ...args));
}

// ========== EXTENSION CONFIGURATION ==========
const AUDIO_EXTS = new Set([
  '.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg', '.wma', '.opus'
]);
const VIDEO_EXTS = new Set([
  '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg'
]);
const ALL_MEDIA_EXTS = new Set([...AUDIO_EXTS, ...VIDEO_EXTS]);

// ========== GLOBALS FOR OPTIONS ==========
let targetDir = null;
let outputFile = null;
let mode = 'all'; // 'all', 'audio', 'video', 'anime'
let extSet = ALL_MEDIA_EXTS;
let modeLabel = 'all media';
let watchMode = false;

// ========== PARSE ARGUMENTS ==========
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--music') {
    mode = 'audio';
    extSet = AUDIO_EXTS;
    modeLabel = 'audio';
  } else if (arg === '--seriesvideo') {
    mode = 'video';
    extSet = VIDEO_EXTS;
    modeLabel = 'video';
  } else if (arg === '--anime') {
    mode = 'anime';
    extSet = VIDEO_EXTS;
    modeLabel = 'anime';
  } else if (arg === '--output' || arg === '-o') {
    if (i + 1 < args.length) {
      outputFile = args[++i];
    } else {
      logError('❌ --output requires a filename.');
      process.exit(1);
    }
  } else if (arg === '--watch') {
    watchMode = true;
  } else if (arg === '--verbose') {
    verbose = true;
  } else if (arg === '--v' || arg === '--version') {
    console.log(`createm3u.js version ${VERSION}`);
    process.exit(0);
  } else if (arg === '--about') {
    console.log(ABOUT);
    process.exit(0);
  } else if (!targetDir) {
    targetDir = arg;
  } else {
    logError('Unknown argument: %s', arg);
    process.exit(1);
  }
}

if (!targetDir) {
  logError('Usage: node createm3u.js <directory> [options]');
  console.error('Or: node createm3u.js --v / --about');
  process.exit(1);
}

const baseDir = path.resolve(targetDir);

if (!fs.existsSync(baseDir)) {
  logError('Directory not found: %s', baseDir);
  process.exit(1);
}
if (!fs.statSync(baseDir).isDirectory()) {
  logError('Path is not a directory: %s', baseDir);
  process.exit(1);
}

if (!outputFile) {
  outputFile = path.join(baseDir, 'playlist.m3u');
} else {
  if (!path.isAbsolute(outputFile)) {
    outputFile = path.join(baseDir, outputFile);
  }
}
const outDir = path.dirname(outputFile);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// ========== SCAN FUNCTION ==========
function scanDirectory(dir, base, extSet) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      logVerbose('  -> scanning subfolder: %s', fullPath);
      results = results.concat(scanDirectory(fullPath, base, extSet));
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (extSet.has(ext)) {
        const rel = path.relative(base, fullPath);
        logVerbose('  + %s', rel);
        results.push(rel);
      }
    }
  }
  return results;
}

// ========== GENERATE PLAYLIST ==========
function generatePlaylist() {
  logInfo('Scanning directory: %s (mode: %s)', baseDir, modeLabel);
  let mediaFiles = scanDirectory(baseDir, baseDir, extSet);

  if (mediaFiles.length === 0) {
    logWarn('No matching files found.');
  } else {
    logInfo('Found %s files.', mediaFiles.length);
  }

  // Sorting
  if (mode === 'video') {
    // Existing seriesvideo sorting by last number
    function extractNumbers(filename) {
      const name = path.basename(filename, path.extname(filename));
      const matches = name.match(/\d+/g);
      if (!matches) return null;
      return parseInt(matches[matches.length - 1], 10);
    }
    mediaFiles.sort((a, b) => {
      const numA = extractNumbers(a);
      const numB = extractNumbers(b);
      if (numA !== null && numB !== null) return numA - numB;
      return a.localeCompare(b);
    });
  } else if (mode === 'anime') {
    // Custom anime sorting: episodes first, then NCOP, then NCED
    function getCategoryAndNumber(filename) {
      const name = path.basename(filename, path.extname(filename)).toLowerCase();
      let priority = 0; // 0: episode, 1: NCOP, 2: NCED
      if (name.includes('nced')) {
        priority = 2;
      } else if (name.includes('ncop')) {
        priority = 1;
      }
      // Extract last number
      const matches = name.match(/\d+/g);
      let num = 0;
      if (matches) {
        num = parseInt(matches[matches.length - 1], 10);
      }
      return { priority, num };
    }

    mediaFiles.sort((a, b) => {
      const infoA = getCategoryAndNumber(a);
      const infoB = getCategoryAndNumber(b);
      // Sort by priority first
      if (infoA.priority !== infoB.priority) {
        return infoA.priority - infoB.priority;
      }
      // Then by number (ascending)
      if (infoA.num !== infoB.num) {
        return infoA.num - infoB.num;
      }
      // Fallback to alphabetical
      return a.localeCompare(b);
    });
  } else {
    // Default: alphabetical
    mediaFiles.sort((a, b) => a.localeCompare(b));
  }

  const lines = ['#EXTM3U'];
  for (const relPath of mediaFiles) {
    const title = path.basename(relPath, path.extname(relPath));
    lines.push(`#EXTINF:-1,${title}`);
    lines.push(relPath);
  }
  if (lines.length > 1) lines.push('');

  try {
    const content = lines.join('\n');
    fs.writeFileSync(outputFile, content, 'utf8');
    logInfo('✅ Standard M3U playlist created: %s', outputFile);
  } catch (err) {
    logError('❌ Failed to write file: %s', err.message);
    process.exit(1);
  }
}

// ========== FIRST RUN ==========
generatePlaylist();

// ========== WATCH MODE ==========
if (watchMode) {
  logInfo('👀 Watching for changes (press Ctrl+C to stop)...');
  let debounceTimer = null;
  let isGenerating = false;

  const watcher = fs.watch(baseDir, { recursive: true }, (eventType, filename) => {
    if (isGenerating) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      logInfo('Change detected, regenerating playlist...');
      isGenerating = true;
      try {
        generatePlaylist();
      } catch (e) {
        logError('❌ Failed to write file: %s', e.message);
      } finally {
        isGenerating = false;
      }
    }, 300);
  });

  watcher.on('error', (err) => {
    console.error('Watch error:', err);
  });

  process.on('SIGINT', () => {
    console.log('\n👋 Stopping watch mode.');
    watcher.close();
    process.exit(0);
  });
}