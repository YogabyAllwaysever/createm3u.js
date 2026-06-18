# createm3u.js

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

- [Node.js](https://nodejs.org/) (version 10 or later)

---

## 🚀 Usage

```bash
node createm3u.js <directory> [options]
```

Options

Option Description
--music Include only audio files (mp3, flac, wav, etc.)
--seriesvideo Include only video files (mp4, avi, mkv, etc.) and sort by episode number (last digits in filename)
(no mode) Include all media files (audio + video)
--output <name>, -o <name> Specify output filename (default: playlist.m3u in source directory)
--v, --version Display script version
--about Display full information about the script

---

📂 Examples

1. Create a music playlist from a Spotify folder

```bash
node createm3u.js "/storage/emulated/0/music/spotify/" --music --output playlist.m3u
```

2. Create a TV series playlist (sorted by episode number)

```bash
node createm3u.js "/storage/video/series" --seriesvideo -o series.m3u
```

3. Create a mixed playlist (audio + video) with default name

```bash
node createm3u.js "/home/user/media"
```

4. Show version

```bash
node createm3u.js --v
```

5. Show help / about

```bash
node createm3u.js --about
```

---

🎯 Modes and Sorting

· --music
    Scans only extensions: .mp3, .flac, .wav, .m4a, .aac, .ogg, .wma, .opus.
    Sorted alphabetically.
· --seriesvideo
    Scans only video extensions: .mp4, .avi, .mkv, .mov, .wmv, .flv, .webm, .m4v, .mpg, .mpeg.
    Sorted by the last numeric sequence found in the filename (e.g., Episode 01.mp4 → 1).
    If no numbers are present, falls back to alphabetical order.
· No mode
    Includes all audio and video extensions, sorted alphabetically.

---

📄 Generated M3U File Format

· First line: #EXTM3U (extended M3U header)
· Each entry consists of:
  · #EXTINF:-1,<filename without extension>
        (-1 duration means unknown)
  · <relative path from the base directory>

Example output:

```m3u
#EXTM3U
#EXTINF:-1,Song A
music/song_a.mp3
#EXTINF:-1,Song B
music/song_b.flac
#EXTINF:-1,Episode 01
series/ep01.mp4
```

---

🛠️ Technical Details

· Language: JavaScript (Node.js)
· Built‑in modules: fs, path
· License: MIT (see --about)

---

❓ FAQ

Q: What if the directory does not exist?
A: The script will show an error and exit.

Q: Does it support subdirectories?
A: Yes, it scans the entire folder hierarchy recursively.

Q: Can I save the output outside the source directory?
A: Yes, use --output /path/outside/playlist.m3u (the destination folder will be created automatically if needed).

---

📝 License

MIT © 2026 YogabyAllwaysever — see --about for more information.