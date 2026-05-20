# phone-server/

Everything needed to run this backend on an Android phone with a public HTTPS URL, controlled by home-screen buttons.

| File | Purpose |
|---|---|
| `SETUP.md` | Step-by-step phone setup. Start here. Covers both QUICK (free, no domain) and PROD (paid domain) modes. |
| `start.sh` | Boots Node + Cloudflare Tunnel. Becomes the "Start POS" home-screen icon. Auto-detects QUICK vs PROD mode. |
| `stop.sh`  | Kills both processes. Becomes the "Stop POS" home-screen icon. |
| `show-url.sh` | Shows the current public URL and copies it to clipboard. Becomes the "POS URL" home-screen icon. Mainly useful in QUICK mode. |
| `cloudflared-config.example.yml` | Template for `~/.cloudflared/config.yml` on the phone. Only needed for PROD mode. |

## Two modes

- **QUICK (free):** TryCloudflare quick tunnel. No login, no config, no domain. URL like `random-words.trycloudflare.com` and **rotates each restart**. Good for proving the setup works.
- **PROD (~$10/yr):** Named Cloudflare Tunnel with your own domain. Stable URL forever. Drop a `~/.cloudflared/config.yml` on the phone and `start.sh` switches automatically.

Architecture: phone runs Node on `localhost:8000`. `cloudflared` opens an outbound tunnel to Cloudflare's edge, which serves the public HTTPS URL. No inbound ports, no public IP on the phone, automatic HTTPS, WebSockets work.
