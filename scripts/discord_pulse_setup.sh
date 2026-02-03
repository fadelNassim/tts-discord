#!/usr/bin/env bash
set -euo pipefail

SINK_NAME="${1:-${TTS_DISCORD_SINK:-tts_discord_sink}}"
MONITOR_TO_SPEAKERS="${TTS_DISCORD_MONITOR_TO_SPEAKERS:-0}"

STATE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/tts-discord"
STATE_FILE="$STATE_DIR/pulse_state.env"

_need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[ERROR] Missing required command: $1" >&2
    exit 1
  }
}

if ! command -v pactl >/dev/null 2>&1; then
  echo "[ERROR] 'pactl' not found. This setup method needs PulseAudio/pipewire-pulse tools." >&2
  echo "[HINT] Install package(s) that provide pactl (often: 'pulseaudio-utils' and/or 'pipewire-pulse')." >&2
  exit 1
fi
_need_cmd awk
_need_cmd grep

if ! command -v paplay >/dev/null 2>&1; then
  echo "[WARN] 'paplay' not found. Auto-play may not work until you install it (package often named 'pulseaudio-utils')." >&2
fi

mkdir -p "$STATE_DIR"

DEFAULT_SINK="$(pactl info | awk -F': ' '/Default Sink:/{print $2}')"
DEFAULT_SOURCE="$(pactl info | awk -F': ' '/Default Source:/{print $2}')"

{
  echo "SINK_NAME=$SINK_NAME"
  echo "PREV_DEFAULT_SINK=$DEFAULT_SINK"
  echo "PREV_DEFAULT_SOURCE=$DEFAULT_SOURCE"
  echo "NULL_SINK_MODULE_ID="
  echo "REMAP_SOURCE_MODULE_ID="
  echo "VIRTUAL_SOURCE_NAME="
  echo "LOOPBACK_MODULE_ID="
} > "$STATE_FILE"

if pactl list short sinks | awk '{print $2}' | grep -qx "$SINK_NAME"; then
  echo "[OK] Sink already exists: $SINK_NAME"
else
  MODULE_ID="$(pactl load-module module-null-sink \
    sink_name="$SINK_NAME" \
    sink_properties="device.description=TTS%20Discord%20Sink")"
  sed -i "s/^NULL_SINK_MODULE_ID=.*/NULL_SINK_MODULE_ID=$MODULE_ID/" "$STATE_FILE"
  echo "[OK] Created sink: $SINK_NAME (module $MODULE_ID)"
fi

MONITOR_SOURCE="${SINK_NAME}.monitor"

# Prefer creating a dedicated virtual mic (source) so Discord can list/select it.
# If the module isn't available (some pipewire-pulse builds), fall back to using the monitor source.
VIRTUAL_SOURCE_NAME="${SINK_NAME}_mic"

if pactl list short sources | awk '{print $2}' | grep -qx "$VIRTUAL_SOURCE_NAME"; then
  echo "[OK] Virtual mic source already exists: $VIRTUAL_SOURCE_NAME"
else
  set +e
  REMAP_ID="$(pactl load-module module-remap-source \
    master="$MONITOR_SOURCE" \
    source_name="$VIRTUAL_SOURCE_NAME" \
    source_properties="device.description=TTS%20Discord%20Mic" 2>/dev/null)"
  REMAP_RC=$?
  set -e

  if [[ $REMAP_RC -eq 0 && -n "${REMAP_ID:-}" ]]; then
    sed -i "s/^REMAP_SOURCE_MODULE_ID=.*/REMAP_SOURCE_MODULE_ID=$REMAP_ID/" "$STATE_FILE"
    sed -i "s/^VIRTUAL_SOURCE_NAME=.*/VIRTUAL_SOURCE_NAME=$VIRTUAL_SOURCE_NAME/" "$STATE_FILE"
    echo "[OK] Created virtual mic source: $VIRTUAL_SOURCE_NAME (module $REMAP_ID)"
  else
    echo "[WARN] Could not create remapped mic source (module-remap-source unavailable?)."
    echo "[HINT] Falling back to monitor source: $MONITOR_SOURCE"
    VIRTUAL_SOURCE_NAME="$MONITOR_SOURCE"
    sed -i "s/^VIRTUAL_SOURCE_NAME=.*/VIRTUAL_SOURCE_NAME=$VIRTUAL_SOURCE_NAME/" "$STATE_FILE"
  fi
fi

# Set default source so Discord can use "Default" input.
pactl set-default-source "$VIRTUAL_SOURCE_NAME"
echo "[OK] Default source set to: $VIRTUAL_SOURCE_NAME"

# Optional: also hear the TTS locally by looping it into your current default sink.
if [[ "$MONITOR_TO_SPEAKERS" == "1" ]]; then
  LOOP_ID="$(pactl load-module module-loopback source="$MONITOR_SOURCE" sink="$DEFAULT_SINK" latency_msec=10)"
  sed -i "s/^LOOPBACK_MODULE_ID=.*/LOOPBACK_MODULE_ID=$LOOP_ID/" "$STATE_FILE"
  echo "[OK] Loopback enabled (module $LOOP_ID) -> $DEFAULT_SINK"
fi

echo
echo "[NEXT] In Discord: Settings → Voice & Video → Input Device = Default"
echo "       Or select: TTS Discord Mic (if listed)"
echo "       Then enable 'Auto-play to Discord mic' in the app."
echo "[INFO] State saved to: $STATE_FILE"
