#!/usr/bin/env bash
# Génère les flux HLS de DÉMONSTRATION (simulateur vidéo, local et préproduction uniquement).
# Qualités validées : 360p, 480p, 720p (pas de 1080p). Segments fMP4 de 4 s, comme un flux de diffusion réel.
# Une variante VP9 supplémentaire permet aux navigateurs de test sans H.264 (Chromium de Playwright) de lire le flux.
set -euo pipefail
SRC=public/maquettes/videos
OUT=demo-media/hls
rm -rf "$OUT"; mkdir -p "$OUT"

encode() { # $1 source, $2 identifiant, $3 portrait|landscape
  local src=$1 id=$2 dir="$OUT/$2"; mkdir -p "$dir"
  local sizes
  if [ "$3" = portrait ]; then sizes="360:640 480:854 720:1280"; else sizes="640:360 854:480 1280:720"; fi
  local i=0 master="#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-INDEPENDENT-SEGMENTS\n"
  for s in $sizes; do
    local w=${s%:*} h=${s#*:}
    local short=$(( w < h ? w : h )) name br
    name="${short}p"
    case $short in 360) br=400k;; 480) br=700k;; 720) br=1200k;; esac
    ffmpeg -loglevel error -y -i "$src" -an -vf "scale=$w:$h" -c:v libx264 -profile:v main -preset veryfast \
      -crf 32 -maxrate $br -bufsize $br -g 48 -keyint_min 48 -sc_threshold 0 \
      -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_type fmp4 \
      -hls_fmp4_init_filename "h264-$name-init.mp4" -hls_segment_filename "$dir/h264-$name-%02d.m4s" "$dir/h264-$name.m3u8"
    master+="#EXT-X-STREAM-INF:BANDWIDTH=$(( ${br%k} * 1100 )),RESOLUTION=${w}x${h},CODECS=\"avc1.4d401f\"\nh264-$name.m3u8\n"
  done
  # Variante VP9 480p (navigateurs de test sans H.264)
  local w h; if [ "$3" = portrait ]; then w=480; h=854; else w=854; h=480; fi
  ffmpeg -loglevel error -y -i "$src" -an -vf "scale=$w:$h" -c:v libvpx-vp9 -crf 45 -b:v 500k -deadline realtime -cpu-used 8 -row-mt 1 \
    -g 48 -keyint_min 48 -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_type fmp4 \
    -hls_fmp4_init_filename "vp9-480p-init.mp4" -hls_segment_filename "$dir/vp9-480p-%02d.m4s" "$dir/vp9-480p.m3u8"
  master+="#EXT-X-STREAM-INF:BANDWIDTH=550000,RESOLUTION=${w}x${h},CODECS=\"vp09.00.30.08\"\nvp9-480p.m3u8\n"
  printf "$master" > "$dir/playlist.m3u8"
}

for n in 1 2 3 4 5 6; do encode "$SRC/episode-$n-vertical.mp4" "demo-$n" portrait; done
encode "$SRC/episode-horizontal.mp4" demo-horizontal landscape
du -sh "$OUT"
