#!/usr/bin/env bash
set -euo pipefail
ROOT=/home/god/Videos/section-inspector
PROFILE=/home/god/.cache/section-inspector
PORT=9444
URL=http://127.0.0.1:8210/services/digital-printing
mkdir -p "$PROFILE"
exec google-chrome --user-data-dir="$PROFILE" --no-first-run --no-default-browser-check --disable-default-apps --load-extension="$ROOT" --remote-debugging-port="$PORT" "$URL"
