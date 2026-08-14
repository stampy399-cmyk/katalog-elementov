#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/MANIFEST.json"

jq -e '
  length == 7 and
  ([.[].group_id] | unique | length) == 7 and
  ([.[].file] | unique | length) == 7 and
  all(.[]; keys == ["file", "group_id", "status"] and .status == "gotov" and (.file | endswith(".mp4")))
' "$MANIFEST" >/dev/null

while IFS= read -r file; do
  media_path="$SCRIPT_DIR/$file"
  test -f "$media_path"
  ffprobe -v error -count_frames \
    -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,channels,channel_layout,nb_read_frames \
    -of json "$media_path" | jq -e '
      ((.format.duration | tonumber) - 5 | fabs) < 0.02 and
      ([.streams[] | select(.codec_type == "video")] | length) == 1 and
      ([.streams[] | select(.codec_type == "audio")] | length) == 1 and
      any(.streams[]; .codec_type == "video" and .codec_name == "h264" and .width == 1920 and .height == 1080 and .r_frame_rate == "30/1" and .nb_read_frames == "150") and
      any(.streams[]; .codec_type == "audio" and .codec_name == "aac" and .channels == 2 and .channel_layout == "stereo")
  ' >/dev/null
  moov_offset="$(LC_ALL=C grep -abo moov "$media_path" | sed -n '1s/:.*//p')"
  mdat_offset="$(LC_ALL=C grep -abo mdat "$media_path" | sed -n '1s/:.*//p')"
  test -n "$moov_offset" -a -n "$mdat_offset"
  ((moov_offset < mdat_offset))
  for audio_filter in volumedetect "pan=mono|c0=c0-c1,volumedetect"; do
    ffmpeg -hide_banner -nostats -nostdin -i "$media_path" -map 0:a:0 -af "$audio_filter" -f null - 2>&1 | awk '
      /max_volume:/ {value=$(NF-1); found=1}
      END {exit !(found && (value == "-inf" || value + 0 <= -90))}
    '
  done
done < <(jq -r '.[].file' "$MANIFEST")

python3 - "$SCRIPT_DIR/photo-fullscreen.mp4" <<'PY'
import sys

import cv2
import numpy as np

capture = cv2.VideoCapture(sys.argv[1])
frames = []
index = 0
while True:
    ok, frame = capture.read()
    if not ok:
        break
    if 15 <= index < 135:
        gray = cv2.cvtColor(cv2.resize(frame, (480, 270), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
        frames.append(gray.astype(np.float32) / 255.0)
    index += 1
capture.release()

scales = []
for previous, current in zip(frames, frames[1:]):
    warp = np.eye(2, 3, dtype=np.float32)
    _, warp = cv2.findTransformECC(
        previous,
        current,
        warp,
        cv2.MOTION_AFFINE,
        (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 80, 1e-7),
        None,
        3,
    )
    scales.append(float(np.sqrt(abs(np.linalg.det(warp[:, :2])))))

mean = float(np.mean(scales))
deviation = float(np.std(scales))
if len(scales) != 119 or deviation > 0.00020 or max(abs(scale - mean) for scale in scales) > 0.00075:
    raise SystemExit(1)
print(f"ZOOM PASS 119/119 mean={mean:.8f} std={deviation:.8f}")
PY

printf 'PASS 7/7\n'
