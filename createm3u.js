// createm3u.js
// Usage:
//   node createm3u.js "/path/to/folder" [--music] [--seriesvideo] [--output name.m3u] [--v] [--about]
// Examples:
//   node createm3u.js "/storage/emulated/0/music/spotify/" --music --output playlist.m3u
//   node createm3u.js "/storage/video/series" --seriesvideo -o series.m3u
//   node createm3u.js --v
//   node createm3u.js --about

const fs = require('fs');
const path = require('path');

// ========== VERSION AND ABOUT ==========
const VERSION = '1.1.1';
const ABOUT = `
createm3u.js - M3U playlist generator
Version: ${VERSION}

Purpose:
  Recursively scan a directory and generate an M3U playlist file
  in extended format (#EXTM3U and #EXTINF).

Modes:
  --music          : include only audio files (mp3, flac, etc.)
  --seriesvideo    : include only video files (mp4, avi, etc.) and sort by episode number
  (no mode)        : include all media (audio + video)

Options:
  --output, -o <name>   : specify output file name (default: playlist.m3u in source directory)
  --v, --version        : show version
  --about               : show information about this script

M3U format:
  Each entry is written as:
    #EXTINF:-1,<filename without extension>
    <relative path from base directory>

License: MIT
https://github.com/YogabyAllwaysever/createm3u.js
`;

// ========== EXTENSION CONFIGURATION ==========
const AUDIO_EXTS = new Set([
  '.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg', '.wma', '.opus'
]);
const VIDEO_EXTS = new Set([
  '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg'
]);
const ALL_MEDIA_EXTS = new Set([...AUDIO_EXTS, ...VIDEO_EXTS]);

// ========== PARSE ARGUMENTS ==========
const args = process.argv.slice(2);
let targetDir = null;
let outputFile = null;
let mode = 'all'; // 'all', 'audio', 'video'

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--music') {
    mode = 'audio';
  } else if (arg === '--seriesvideo') {
    mode = 'video';
  } else if (arg === '--output' || arg === '-o') {
    if (i + 1 < args.length) {
      outputFile = args[++i];
    } else {
      console.error('Error: --output requires a filename.');
      process.exit(1);
    }
  } else if (arg === '--v' || arg === '--version') {
    console.log(`createm3u.js version ${VERSION}`);
    process.exit(0);
  } else if (arg === '--about') {
    console.log(ABOUT);
    process.exit(0);
  } else if (!targetDir) {
    targetDir = arg;
  } else {
    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }
}

if (!targetDir) {
  console.error('Usage: node createm3u.js <directory> [--music] [--seriesvideo] [--output <filename>]');
  console.error('Or: node createm3u.js --v / --about');
  process.exit(1);
}

// Resolve absolute path
const baseDir = path.resolve(targetDir);

if (!fs.existsSync(baseDir)) {
  console.error(`Directory not found: ${baseDir}`);
  process.exit(1);
}
if (!fs.statSync(baseDir).isDirectory()) {
  console.error(`Path is not a directory: ${baseDir}`);
  process.exit(1);
}

// Determine default output file
if (!outputFile) {
  outputFile = path.join(baseDir, 'playlist.m3u');
} else {
  if (!path.isAbsolute(outputFile)) {
    outputFile = path.join(baseDir, outputFile);
  }
}
// Create output directory if it doesn't exist
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
      results = results.concat(scanDirectory(fullPath, base, extSet));
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (extSet.has(ext)) {
        const rel = path.relative(base, fullPath);
        results.push(rel);
      }
    }
  }
  return results;
}

// Choose extension set based on mode
let extSet;
let modeLabel;
if (mode === 'audio') {
  extSet = AUDIO_EXTS;
  modeLabel = 'audio';
} else if (mode === 'video') {
  extSet = VIDEO_EXTS;
  modeLabel = 'video';
} else {
  extSet = ALL_MEDIA_EXTS;
  modeLabel = 'all media';
}

console.log(`Scanning directory: ${baseDir} (mode: ${modeLabel})`);
let mediaFiles = scanDirectory(baseDir, baseDir, extSet);

if (mediaFiles.length === 0) {
  console.warn('No matching files found.');
} else {
  console.log(`Found ${mediaFiles.length} files.`);
}

// ========== SORTING ==========
if (mode === 'video') {
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
} else {
  mediaFiles.sort((a, b) => a.localeCompare(b));
}

// ========== BUILD STANDARD M3U CONTENT ==========
const lines = [];
// Extended M3U header
lines.push('#EXTM3U');

for (const relPath of mediaFiles) {
  const fullPath = path.join(baseDir, relPath);
  const fileName = path.basename(relPath);
  const title = path.basename(relPath, path.extname(relPath)); // without extension
  // EXTINF line: duration -1 (unknown), title = file name
  lines.push(`#EXTINF:-1,${title}`);
  lines.push(relPath);
}

// Add trailing newline if there is content
if (lines.length > 1) {
  lines.push(''); // for trailing newline
}

// ========== WRITE FILE ==========
try {
  const content = lines.join('\n');
  fs.writeFileSync(outputFile, content, 'utf8');
  console.log(`✅ Standard M3U playlist created: ${outputFile}`);
} catch (err) {
  console.error(`❌ Failed to write file: ${err.message}`);
  process.exit(1);
}