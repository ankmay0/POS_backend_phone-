#!/data/data/com.termux/files/usr/bin/bash
# Show the current public URL and copy it to the Android clipboard.
# Useful in TryCloudflare mode where the URL rotates each Start.
# Bind this as a third Termux:Widget shortcut named "POS URL".

URL_FILE="$HOME/pos-logs/public-url.txt"

if [ ! -s "$URL_FILE" ]; then
  termux-notification --id pos-url --title "POS URL" --content "Not running — tap Start POS first."
  echo "No URL on file. Run start.sh first."
  exit 1
fi

url="$(cat "$URL_FILE")"

# Copy to clipboard (requires Termux:API).
command -v termux-clipboard-set >/dev/null 2>&1 && \
  printf '%s' "$url" | termux-clipboard-set

termux-notification --id pos-url --title "POS URL (copied)" --content "$url"
echo "$url"
