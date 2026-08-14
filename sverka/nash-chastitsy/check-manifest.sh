#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ATOM_DIR="$SCRIPT_DIR/../atomy/chastitsy"
MANIFEST="$SCRIPT_DIR/MANIFEST.json"

jq -e 'length == 8 and all(.[]; .status == "gotov")' "$MANIFEST" >/dev/null
while IFS=$'\t' read -r group_id file; do
  test -x "$ATOM_DIR/$group_id.sh"
  test -s "$SCRIPT_DIR/$file"
  probe="$(ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate,pix_fmt -of json "$SCRIPT_DIR/$file")"
  jq -e '
    any(.streams[]; .codec_type == "video" and .width == 1920 and .height == 1080 and .r_frame_rate == "30/1" and .pix_fmt == "yuv420p") and
    any(.streams[]; .codec_type == "audio") and
    (.format.duration | tonumber) >= 4.99 and
    (.format.duration | tonumber) <= 5.01
  ' <<<"$probe" >/dev/null
done < <(jq -r '.[] | [.group_id, .file] | @tsv' "$MANIFEST")

echo "PASS: 8 manifest entries; scripts and 1920x1080/30fps/5s/yuv420p/audio renders exist"
