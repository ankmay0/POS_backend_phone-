#!/data/data/com.termux/files/usr/bin/bash
# Stop the POS backend + Cloudflare Tunnel.
# Invoked by tapping the "Stop POS" Termux:Widget icon on the home screen.

set -u

LOG_DIR="$HOME/pos-logs"
NODE_PID="$LOG_DIR/node.pid"
TUNNEL_PID="$LOG_DIR/cloudflared.pid"

notify() {
  command -v termux-notification >/dev/null 2>&1 && \
    termux-notification --id pos-server --title "POS Server" --content "$1" --ongoing
  command -v termux-notification-remove >/dev/null 2>&1 && \
    termux-notification-remove pos-server 2>/dev/null
}

kill_pidfile() {
  local pidfile="$1" name="$2"
  if [ -f "$pidfile" ]; then
    local pid
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      # Give it 5s to exit cleanly, then SIGKILL.
      for _ in 1 2 3 4 5; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 1
      done
      kill -9 "$pid" 2>/dev/null || true
      echo "Stopped $name (PID $pid)"
    fi
    rm -f "$pidfile"
  fi
}

kill_pidfile "$TUNNEL_PID" "cloudflared"
kill_pidfile "$NODE_PID"   "node"

# Belt and suspenders — kill any stragglers.
pkill -f "cloudflared tunnel run" 2>/dev/null || true
pkill -f "node server.js"         2>/dev/null || true

# Release the wake lock so the phone can sleep.
termux-wake-unlock 2>/dev/null || true

notify "Stopped"
echo "Stopped."
