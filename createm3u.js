#!/usr/bin/env node

// createm3u.js
// Usage:
//   node createm3u.js "/path/to/folder" [--music] [--seriesvideo] [--anime] [--output name.m3u] [--watch] [--lang en|id|ja] [--verbose] [--v] [--about]
// Examples:
//   node createm3u.js "/storage/emulated/0/music/spotify/" --music --output playlist.m3u
//   node createm3u.js "/storage/video/series" --seriesvideo -o series.m3u --watch --lang id
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
  --lang <en|id|ja>     : language for messages (default: en)
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

// ========== TRANSLATIONS ==========
const LANG = {
  en: {
    scanning: 'Scanning directory: %s (mode: %s)',
    found: 'Found %d files.',
    noFiles: 'No matching files found.',
    created: '✅ Standard M3U playlist created: %s',
    writeError: '❌ Failed to write file: %s',
    dirNotFound: 'Directory not found: %s',
    notDir: 'Path is not a directory: %s',
    unknownArg: 'Unknown argument: %s',
    missingDir: 'Usage: node createm3u.js <directory> [options]',
    watching: '👀 Watching for changes (press Ctrl+C to stop)...',
    changeDetected: 'Change detected, regenerating playlist...',
    verboseFile: '  + %s',
    verboseDir: '  -> scanning subfolder: %s',
  },
  id: {
    scanning: 'Memindai direktori: %s (mode: %s)',
    found: 'Ditemukan %d file.',
    noFiles: 'Tidak ada file yang cocok.',
    created: '✅ Playlist M3U standar dibuat: %s',
    writeError: '❌ Gagal menulis file: %s',
    dirNotFound: 'Direktori tidak ditemukan: %s',
    notDir: 'Path bukan direktori: %s',
    unknownArg: 'Argumen tidak dikenal: %s',
    missingDir: 'Cara pakai: node createm3u.js <direktori> [opsi]',
    watching: '👀 Memantau perubahan (tekan Ctrl+C untuk berhenti)...',
    changeDetected: 'Perubahan terdeteksi, membuat ulang playlist...',
    verboseFile: '  + %s',
    verboseDir: '  -> memindai subfolder: %s',
  },
  ja: {
    scanning: 'ディレクトリをスキャン中: %s (モード: %s)',
    found: '%d ファイルが見つかりました。',
    noFiles: '一致するファイルがありません。',
    created: '✅ 標準M3Uプレイリストを作成しました: %s',
    writeError: '❌ ファイルの書き込みに失敗しました: %s',
    dirNotFound: 'ディレクトリが見つかりません: %s',
    notDir: 'パスはディレクトリではありません: %s',
    unknownArg: '不明な引数: %s',
    missingDir: '使用方法: node createm3u.js <ディレクトリ> [オプション]',
    watching: '👀 変更を監視中 (Ctrl+Cで停止)...',
    changeDetected: '変更を検出、プレイリストを再生成中...',
    verboseFile: '  + %s',
    verboseDir: '  -> サブフォルダをスキャン: %s',
  }
};

// ========== EXTENSION CONFIGURATION ==========
const AUDIO_EXTS = new Set([
  '.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg', '.wma', '.opus'
]);
const VIDEO_EXTS = new Set([
  '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg'
]);
const ALL_MEDIA_EXTS = new Set([...AUDIO_EXTS, ...VIDEO_EXTS]);

// ========== GLOBALS FOR OPTIONS ==========
let currentLang = 'en';
let verbose = false;
let watchMode = false;
let targetDir = null;
let outputFile = null;
let mode = 'all'; // 'all', 'audio', 'video', 'anime'
let extSet = ALL_MEDIA_EXTS;
let modeLabel = 'all media';

// ========== TRANSLATION HELPER ==========
function t(key, ...args) {
  const dict = LANG[currentLang] || LANG.en;
  let msg = dict[key] || key;
  for (let i = 0; i < args.length; i++) {
    msg = msg.replace('%s', args[i]);
  }
  return msg;
}

function logInfo(key, ...args) {
  console.log(t(key, ...args));
}

function logVerbose(key, ...args) {
  if (verbose) {
    console.log(t(key, ...args));
  }
}

function logWarn(key, ...args) {
  console.warn(t(key, ...args));
}

function logError(key, ...args) {
  console.error(t(key, ...args));
}

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
      logError('writeError', '--output requires a filename.');
      process.exit(1);
    }
  } else if (arg === '--watch') {
    watchMode = true;
  } else if (arg === '--lang') {
    if (i + 1 < args.length) {
      const l = args[++i];
      if (l in LANG) {
        currentLang = l;
      } else {
        logError('unknownArg', l);
        process.exit(1);
      }
    } else {
      logError('writeError', '--lang requires en, id, or ja.');
      process.exit(1);
    }
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
    logError('unknownArg', arg);
    process.exit(1);
  }
}

if (!targetDir) {
  logError('missingDir');
  console.error('Or: node createm3u.js --v / --about');
  process.exit(1);
}

const baseDir = path.resolve(targetDir);

if (!fs.existsSync(baseDir)) {
  logError('dirNotFound', baseDir);
  process.exit(1);
}
if (!fs.statSync(baseDir).isDirectory()) {
  logError('notDir', baseDir);
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
      logVerbose('verboseDir', fullPath);
      results = results.concat(scanDirectory(fullPath, base, extSet));
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (extSet.has(ext)) {
        const rel = path.relative(base, fullPath);
        logVerbose('verboseFile', rel);
        results.push(rel);
      }
    }
  }
  return results;
}

// ========== GENERATE PLAYLIST ==========
function generatePlaylist() {
  logInfo('scanning', baseDir, modeLabel);
  let mediaFiles = scanDirectory(baseDir, baseDir, extSet);

  if (mediaFiles.length === 0) {
    logWarn('noFiles');
  } else {
    logInfo('found', mediaFiles.length);
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
    logInfo('created', outputFile);
  } catch (err) {
    logError('writeError', err.message);
    process.exit(1);
  }
}

// ========== FIRST RUN ==========
generatePlaylist();

// ========== WATCH MODE ==========
if (watchMode) {
  logInfo('watching');
  let debounceTimer = null;
  let isGenerating = false;

  const watcher = fs.watch(baseDir, { recursive: true }, (eventType, filename) => {
    if (isGenerating) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      logInfo('changeDetected');
      isGenerating = true;
      try {
        generatePlaylist();
      } catch (e) {
        logError('writeError', e.message);
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