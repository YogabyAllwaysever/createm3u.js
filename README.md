# createm3u.js

![Image](images/logo.png)

A Node.js‑based M3U playlist generator (extended format).  
This script recursively scans a directory, collects media files (audio/video), and generates an `.m3u` file with the following format:

```
#EXTM3U
#EXTINF:-1,Song Title
song.mp3
#EXTINF:-1,Episode 01
series/ep01.mp4
```

---

## 📦 Prerequisites

- [Node.js](https://nodejs.org/) (version 10 or later; `--watch` with recursive mode requires Node.js 20+)

---

## 📥 Installation

You can install **createm3u** globally via npm (recommended for command‑line use):

```bash
npm install -g createm3u
```

After installation, the `createm3u` command will be available system‑wide.

Alternatively, you can run the script directly without installing (clone or download the file):

```bash
node createm3u.js <directory> [options]
```

> **Note:** If you install globally, replace `node createm3u.js` with `createm3u` in all examples below.

---

## 🚀 Usage

### Global installation (recommended)
```bash
createm3u <directory> [options]
```

### Direct execution (without install)
```bash
node createm3u.js <directory> [options]
```

---

## ⚙️ Options

| Option | Description |
|--------|-------------|
| `--music` | Include **only audio files** (`.mp3`, `.flac`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.wma`, `.opus`). Sorted alphabetically. |
| `--seriesvideo` | Include **only video files** (`.mp4`, `.avi`, `.mkv`, `.mov`, `.wmv`, `.flv`, `.webm`, `.m4v`, `.mpg`, `.mpeg`) and sort by **episode number** (last numeric sequence in filename). |
| `--anime` | Include **only video files** and sort in **anime order**: episodes first, then NCOP, then NCED (each group sorted by episode number). |
| *(no mode)* | Include **all media files** (audio + video). Sorted alphabetically. |
| `--output <name>`, `-o <name>` | Specify output filename (default: `playlist.m3u` in the source directory). |
| `--watch` | Watch the directory for changes and automatically regenerate the playlist (debounced by 300ms). Requires Node.js 20+ for recursive watching. |
| `--lang <en\|id\|ja>` | Language for console messages (default: `en`). |
| `--verbose` | Show detailed logs for each scanned file and subfolder. |
| `--v`, `--version` | Display script version. |
| `--about` | Display full information about the script (author, license, purpose, etc.). |

---

## 📂 Examples

1. **Create a music playlist from a Spotify folder**
   ```bash
   createm3u "/storage/emulated/0/music/spotify/" --music --output playlist.m3u
   ```

2. **Create a TV series playlist (sorted by episode number)**
   ```bash
   createm3u "/storage/video/series" --seriesvideo -o series.m3u
   ```

3. **Create an anime playlist (episodes → NCOP → NCED)**
   ```bash
   createm3u "/storage/anime" --anime -o anime.m3u
   ```

4. **Create a mixed playlist (audio + video) with default name**
   ```bash
   createm3u "/home/user/media"
   ```

5. **Watch a folder and regenerate playlist on changes**
   ```bash
   createm3u "/home/user/music" --music --watch --lang id
   ```

6. **Show verbose output while scanning**
   ```bash
   createm3u "/home/user/videos" --seriesvideo --verbose
   ```

7. **Show version**
   ```bash
   createm3u --v
   ```

8. **Show help / about**
   ```bash
   createm3u --about
   ```

---

## 🎯 Modes and Sorting

- **`--music`**  
  Scans only audio extensions (listed above).  
  **Sorting:** Alphabetical.

- **`--seriesvideo`**  
  Scans only video extensions.  
  **Sorting:** Extracts the **last group of digits** from the filename (e.g., `Episode 01.mp4` → `1`, `s01e05.mkv` → `5`) and sorts numerically. If no digits are found, falls back to alphabetical.

- **`--anime`**  
  Scans only video extensions.  
  **Sorting:**  
  1. **Episodes** (any file not containing `nced` or `ncop`) – sorted by episode number.  
  2. **NCOP** (files containing `ncop`) – sorted by number.  
  3. **NCED** (files containing `nced`) – sorted by number.  
  Within each group, sorting is by the last numeric sequence.

- **No mode**  
  Includes all audio and video extensions.  
  **Sorting:** Alphabetical.

---

## 📄 Generated M3U File Format

- First line: `#EXTM3U` (extended M3U header).  
- Each entry consists of:
  - `#EXTINF:-1,<filename without extension>` (`-1` duration means unknown)
  - `<relative path from the base directory>`

**Example output:**

```m3u
#EXTM3U
#EXTINF:-1,Song A
music/song_a.mp3
#EXTINF:-1,Song B
music/song_b.flac
#EXTINF:-1,Episode 01
series/ep01.mp4
#EXTINF:-1,NCOP 01
anime/ncop01.mkv
#EXTINF:-1,NCED 01
anime/nced01.mkv
```

---

## 🛠️ Technical Details

- **Language:** JavaScript (Node.js)  
- **Built‑in modules:** `fs`, `path`  
- **Watch mode:** Uses `fs.watch` with `recursive: true` (available in Node.js 20+). On older versions, the `--watch` flag may not work recursively.  
- **License:** MIT (see `--about`)

---

## ❓ FAQ

**Q: What if the directory does not exist?**  
A: The script will show an error and exit.

**Q: Does it support subdirectories?**  
A: Yes, it scans the entire folder hierarchy recursively.

**Q: Can I save the output outside the source directory?**  
A: Yes, use `--output /path/outside/playlist.m3u` (the destination folder will be created automatically if needed).

**Q: How does the episode sorting work?**  
A: It extracts the **last group of digits** from the filename (e.g., `s01e05` → `5`, `Episode 12` → `12`) and sorts by that number. If no digits are found, alphabetical order is used.

**Q: What languages are supported?**  
A: English (`en`), Indonesian (`id`), and Japanese (`ja`). Use `--lang` to switch.

**Q: What is the difference between `--seriesvideo` and `--anime`?**  
A: `--seriesvideo` sorts all videos by episode number only. `--anime` additionally groups files into episodes, NCOP, and NCED, placing NCOP and NCED after all episodes.

---

## 📝 License

MIT © 2026 YogabyAllwaysever — see `--about` for more information.