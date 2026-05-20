# Phone-as-Server Setup (Android + Termux + Cloudflare Tunnel)

End state: tappable Android home-screen icons that boot/halt your backend on the phone and expose it via a public HTTPS URL.

Two modes — pick one:

- **Quick mode (free, no domain)** — uses TryCloudflare. URL rotates every restart. Good for testing the architecture before committing money. Sections marked **[QUICK]** below.
- **Production mode (stable URL, ~$10/yr domain)** — uses a named Cloudflare Tunnel. URL stays the same forever. Sections marked **[PROD]**. Easy upgrade later.

Most of the setup is identical. Mode-specific differences are flagged.

---

## Prerequisites

- **Android phone** dedicated to this role. Plugged in, on the restaurant Wi-Fi.
- **[PROD only]** A domain on Cloudflare (free plan). Skip for **[QUICK]**.
- An hour the first time.

## Step 1 — Install Termux + companions from F-Droid

**Do NOT install from Google Play.** The Play Store versions are abandoned and broken. Use F-Droid:

1. Install F-Droid: https://f-droid.org/
2. From F-Droid, install:
   - **Termux** (the terminal)
   - **Termux:Widget** (puts script shortcuts on the home screen — this is your "button")
   - **Termux:API** (for notifications + wake lock + clipboard)
   - **Termux:Boot** (optional — auto-start on phone reboot)

## Step 2 — First boot of Termux

Open Termux. Run:

```bash
pkg update && pkg upgrade -y
pkg install -y nodejs git openssh termux-api
termux-setup-storage   # grants Termux access to phone storage; accept the prompt
```

Verify:

```bash
node -v    # should print v20.x or newer
```

## Step 3 — Get the backend code onto the phone

Easiest is `git clone` if your repo is on GitHub:

```bash
cd ~
git clone https://github.com/<you>/<repo>.git backend
cd backend
npm ci --omit=dev
```

Create `~/backend/.env` with your production env vars (MongoDB URI, VAPID keys, PhonePe creds, etc.) — same shape as your current Vercel env, just minus anything Vercel-specific.

Sanity check it boots:

```bash
node server.js
# Expect: "✅ Server running on port 8000"
# Ctrl+C to stop.
```

## Step 4 — Install Cloudflare Tunnel (cloudflared)

cloudflared isn't in the Termux package repos. Grab the ARM64 Linux binary:

```bash
cd ~
curl -L -o cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64
chmod +x cloudflared
mv cloudflared $PREFIX/bin/
cloudflared --version
```

If your phone is 32-bit ARM (rare on anything from the last 5 years), use `cloudflared-linux-arm` instead.

## Step 5 — Tunnel setup

### [QUICK] TryCloudflare path

**Nothing to set up.** No login, no config, no DNS. The `start.sh` script (Step 7) handles it via `cloudflared tunnel --url`. Skip to Step 7.

### [PROD] Named tunnel path

```bash
cloudflared tunnel login
# Opens a Cloudflare URL. Open it on the phone's browser, pick your domain, authorize.

cloudflared tunnel create pos-tunnel
# Prints a UUID and creates ~/.cloudflared/<UUID>.json — keep both.

cloudflared tunnel route dns pos-tunnel pos.yourdomain.com
# Creates the public DNS record. Use any hostname under your domain.
```

Then copy `phone-server/cloudflared-config.example.yml` from this repo to `~/.cloudflared/config.yml` and edit:
- Replace `TUNNEL_UUID` (both occurrences) with the UUID from above
- Replace `pos.yourdomain.com` with your real hostname

`start.sh` auto-detects the config file's presence and switches into named-tunnel mode — no further changes needed.

## Step 6 — Quick smoke test (optional but recommended)

```bash
# Terminal session 1
cd ~/backend && node server.js

# Terminal session 2 (swipe left in Termux for sessions)
cloudflared tunnel --url http://localhost:8000
# Look for a line like:
#   |  https://random-words-xyz.trycloudflare.com  |
# Open that URL in a browser — you should hit your backend.

# Stop both with Ctrl+C in each session.
```

If that worked, the rest is just wiring it to a button.

## Step 7 — Install the start/stop/url scripts

Termux:Widget reads scripts from `~/.shortcuts/`. Anything executable there becomes a home-screen launcher.

```bash
mkdir -p ~/.shortcuts
cp ~/backend/phone-server/start.sh    ~/.shortcuts/Start\ POS
cp ~/backend/phone-server/stop.sh     ~/.shortcuts/Stop\ POS
cp ~/backend/phone-server/show-url.sh ~/.shortcuts/POS\ URL
chmod +x ~/.shortcuts/Start\ POS ~/.shortcuts/Stop\ POS ~/.shortcuts/POS\ URL
chmod 700 ~/.shortcuts
```

(The filenames without `.sh` become the icon labels.)

## Step 8 — Add the buttons to the home screen

On the Android home screen → long-press an empty spot → **Widgets** → drag **Termux:Widget** → pick **Start POS** and place it. Repeat for **Stop POS** and **POS URL**. You now have three tappable icons.

- **Start POS** — boots Node + tunnel, posts a notification with the URL.
- **Stop POS** — kills both, releases wake lock.
- **POS URL** — re-shows the URL and copies it to the Android clipboard. Handy in [QUICK] mode for pasting into PhonePe dashboard each morning.

## Step 9 — (Optional) Auto-start on phone reboot

Install **Termux:Boot** from F-Droid. Then:

```bash
mkdir -p ~/.termux/boot
cp ~/backend/phone-server/start.sh ~/.termux/boot/01-start-pos
chmod +x ~/.termux/boot/01-start-pos
```

Open Termux:Boot once from the app drawer to grant it permission. Reboot to test.

## Step 10 — Point PhonePe and your web POS at the URL

### [QUICK] Daily routine

Because the TryCloudflare URL rotates on every Start:

1. Tap **Start POS** in the morning.
2. Tap **POS URL** to copy the new URL.
3. Paste it into:
   - PhonePe merchant dashboard webhook field
   - Your web POS frontend's API base URL (env var / config — needs a deploy or runtime config endpoint)

This is the friction that justifies upgrading to **[PROD]** mode once you're sure the architecture works. Roughly 2 minutes a day.

### [PROD] One-time wiring

- **PhonePe merchant dashboard** → webhook URL → `https://pos.yourdomain.com/api/phonepe/...` (whatever your current route is)
- **Web POS frontend** → API base URL env var → `https://pos.yourdomain.com`
- **CORS** in `server.js:46-50` already includes `process.env.FRONTEND_URL` — set that to your POS frontend origin in `.env`.

## Daily use

- Morning: tap **Start POS** → notification "Running — https://...". In **[QUICK]** mode, also tap **POS URL** to copy the new hostname for PhonePe.
- Night: tap **Stop POS** → notification "Stopped" → phone can sleep.

Logs live in `~/pos-logs/node.log` and `~/pos-logs/cloudflared.log` if anything misbehaves. Current public URL is in `~/pos-logs/public-url.txt`.

---

## Upgrading [QUICK] → [PROD] later

When you buy a domain:

1. Do Step 5 [PROD] path on the phone.
2. Drop `~/.cloudflared/config.yml` in place.
3. That's it — the next **Start POS** tap will pick up the config file's existence and switch modes automatically. No script changes needed.

---

## What to watch for in the first week

- **Battery health.** If the phone is plugged in 24/7 at 100%, battery degrades fast. Use a smart plug or a charge-limiter app to hold it at 60–80%.
- **Wi-Fi drops.** If the phone falls off Wi-Fi, cloudflared reconnects automatically once it's back. **[QUICK] mode:** the URL stays the same as long as the tunnel process keeps running — it only changes when you stop and start. **[PROD] mode:** URL never changes.
- **PhonePe webhook retries during a "Stop" window.** If a payment confirmation lands while the server is stopped, PhonePe will retry — but only for a limited window. Either keep the server on through PhonePe's retry window after closing, or build a daily reconciliation job that pulls payment status for any orders left in `pending`.
- **OS updates.** Android may reboot the phone for updates overnight. Step 9 (Termux:Boot) handles that — but verify it actually works on your specific phone model.
- **No automatic HTTPS cert renewal needed.** Cloudflare terminates TLS at its edge; cloudflared just speaks an authenticated outbound tunnel. You never touch certs.
