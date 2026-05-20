#!/data/data/com.termux/files/usr/bin/bash
# Start the POS backend + Cloudflare Tunnel on the phone.
# Invoked by tapping the "Start POS" Termux:Widget icon on the home screen.
#
# Tunnel mode is auto-detected:
#   - If ~/.cloudflared/config.yml exists: named tunnel (stable URL, needs a domain).
#   - Otherwise: TryCloudflare quick tunnel (free, no domain, but URL rotates).

set -u

BACKEND_DIR="$HOME/backend"
LOG_DIR="$HOME/pos-logs"
NODE_LOG="$LOG_DIR/node.log"
TUNNEL_LOG="$LOG_DIR/cloudflared.log"
NODE_PID="$LOG_DIR/node.pid"
TUNNEL_PID="$LOG_DIR/cloudflared.pid"
URL_FILE="$LOG_DIR/public-url.txt"
TUNNEL_NAME="${TUNNEL_NAME:-pos-tunnel}"
LOCAL_PORT="${LOCAL_PORT:-8000}"
CONFIG_FILE="$HOME/.cloudflared/config.yml"

# Termux ships without a CA bundle that cloudflared (a Go binary) can find.
# `pkg install ca-certificates` puts the bundle here; point Go's TLS at it.
export SSL_CERT_FILE="${SSL_CERT_FILE:-$PREFIX/etc/tls/cert.pem}"

mkdir -p "$LOG_DIR"

notify() {
  command -v termux-notification >/dev/null 2>&1 && \
    termux-notification --id pos-server --title "POS Server" --content "$1" --ongoing
}

is_running() {
  [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null
}

if is_running "$NODE_PID" || is_running "$TUNNEL_PID"; then
  current_url="$(cat "$URL_FILE" 2>/dev/null || echo unknown)"
  notify "Already running — $current_url"
  echo "Already running. Use stop.sh first."
  exit 0
fi

# Prevent Android from sleeping the CPU.
termux-wake-lock

cd "$BACKEND_DIR" || { notify "backend dir missing"; exit 1; }

# Truncate logs so URL extraction below doesn't pick up yesterday's URL.
: > "$NODE_LOG"
: > "$TUNNEL_LOG"
rm -f "$URL_FILE"

# Boot Node backend.
nohup node server.js >"$NODE_LOG" 2>&1 &
echo $! > "$NODE_PID"

# Give Node a moment to bind before the tunnel attaches.
sleep 2

# Boot Cloudflare Tunnel — named or quick depending on whether config exists.
if [ -f "$CONFIG_FILE" ]; then
  nohup cloudflared tunnel run "$TUNNEL_NAME" >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_MODE=named
else
  nohup cloudflared tunnel --url "http://localhost:$LOCAL_PORT" >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_MODE=quick
fi
echo $! > "$TUNNEL_PID"

# Extract the public URL.
if [ "$TUNNEL_MODE" = quick ]; then
  # TryCloudflare prints the URL into the log a few seconds after boot.
  # Poll up to 20s.
  public_url=""
  for _ in $(seq 1 20); do
    public_url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -n1)"
    [ -n "$public_url" ] && break
    sleep 1
  done
  if [ -n "$public_url" ]; then
    echo "$public_url" > "$URL_FILE"
    notify "Running — $public_url"
    echo "Public URL: $public_url"
    echo "(saved to $URL_FILE)"
  else
    notify "Started but no URL yet — check $TUNNEL_LOG"
    echo "Tunnel didn't print a URL in 20s. Check $TUNNEL_LOG"
  fi
else
  # Named tunnel: hostname is whatever you configured in ~/.cloudflared/config.yml.
  configured_host="$(grep -E '^\s*-\s*hostname:' "$CONFIG_FILE" | head -n1 | awk '{print $NF}')"
  if [ -n "$configured_host" ]; then
    echo "https://$configured_host" > "$URL_FILE"
    notify "Running — https://$configured_host"
    echo "Public URL: https://$configured_host"
  else
    notify "Running (named tunnel)"
  fi
fi
