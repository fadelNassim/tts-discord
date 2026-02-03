#!/usr/bin/env bash
set -euo pipefail

STATE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/tts-discord"
STATE_FILE="$STATE_DIR/pulse_state.env"

_need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[ERROR] Missing required command: $1" >&2
    exit 1
  }
}

if ! command -v pactl >/dev/null 2>&1; then
  echo "[ERROR] 'pactl' not found, so defaults cannot be restored automatically." >&2
  echo "[HINT] Install package(s) that provide pactl (often: 'pulseaudio-utils' and/or 'pipewire-pulse')." >&2
  exit 1
fi

if [[ ! -f "$STATE_FILE" ]]; then
  echo "[ERROR] No state file found at $STATE_FILE" >&2
  echo "Run: scripts/discord_pulse_setup.sh" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$STATE_FILE"

if [[ -n "${PREV_DEFAULT_SOURCE:-}" ]]; then
  pactl set-default-source "$PREV_DEFAULT_SOURCE" || true
  echo "[OK] Restored default source: $PREV_DEFAULT_SOURCE"
fi

if [[ -n "${PREV_DEFAULT_SINK:-}" ]]; then
  pactl set-default-sink "$PREV_DEFAULT_SINK" || true
  echo "[OK] Restored default sink: $PREV_DEFAULT_SINK"
fi

if [[ -n "${LOOPBACK_MODULE_ID:-}" ]]; then
  pactl unload-module "$LOOPBACK_MODULE_ID" || true
  echo "[OK] Unloaded loopback module: $LOOPBACK_MODULE_ID"
fi

if [[ -n "${NULL_SINK_MODULE_ID:-}" ]]; then
  pactl unload-module "$NULL_SINK_MODULE_ID" || true
  echo "[OK] Unloaded null sink module: $NULL_SINK_MODULE_ID"
else
  echo "[INFO] No null-sink module id recorded; leaving sink as-is."
fi

echo "[OK] Teardown complete."
