#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/MANIFEST.json"

jq -e 'length == 4 and all(.[]; .status == "gotov" and (.group_id | type == "string") and (.file | endswith(".mp4")))' "$MANIFEST" >/dev/null

while IFS= read -r file; do
  path="$SCRIPT_DIR/$file"
  test -f "$path"
  ffprobe -v error \
    -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_frames,sample_rate,channels,channel_layout \
    -of json "$path" | jq -e '
      (.format.duration | tonumber) == 5 and
      ([.streams[] | select(.codec_type == "video")] | length) == 1 and
      ([.streams[] | select(.codec_type == "audio")] | length) == 1 and
      any(.streams[]; .codec_type == "video" and .codec_name == "h264" and .width == 1920 and .height == 1080 and .r_frame_rate == "30/1" and .avg_frame_rate == "30/1" and .nb_frames == "150") and
      any(.streams[]; .codec_type == "audio" and .codec_name == "aac" and .sample_rate == "48000" and .channels == 2 and .channel_layout == "stereo")
    ' >/dev/null
done < <(jq -r '.[].file' "$MANIFEST")

printf 'PASS 4/4\n'
