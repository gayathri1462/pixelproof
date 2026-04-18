# Pixelproof

> Pixel-perfect design QA — compare Figma exports against your live UI and get an instant diff report.

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen) ![React](https://img.shields.io/badge/react-18-blue) ![Railway](https://img.shields.io/badge/deploy-Railway-blueviolet) ![Vercel](https://img.shields.io/badge/frontend-Vercel-black) ![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 What it does

Upload a Figma design export, point it at a live URL (or upload a screenshot), and pixelproof tells you **exactly how far off your implementation is** — down to the pixel.

### Key features

✅ **Drag-to-compare slider** — Figma vs live side by side  
✅ **Pixel diff map** — red highlights every mismatched pixel  
✅ **Mismatch %** with Pass / Warn / Fail severity  
✅ **Configurable threshold** — anti-aliasing noise doesn't count as failure  
✅ **Export report as CSV** — share with your team  
✅ **Two input modes** — screenshot any URL OR upload a screenshot directly

---

## 🛠 Tech stack

| Layer                | Tech                                              |
| -------------------- | ------------------------------------------------- |
| **Frontend**         | React 18 + vanilla CSS                            |
| **Backend**          | Node.js + Express                                 |
| **Screenshotter**    | Puppeteer + `@sparticuz/chromium` (Railway-ready) |
| **Diff engine**      | `pixelmatch`                                      |
| **Image normaliser** | `sharp`                                           |

**Deploy:** Vercel (client) + Railway (server) from a single GitHub repo

---

## 📁 Project structure

```
pixelproof/
├── server/                  Node API
│   ├── index.js             Main server
│   ├── package.json
│   ├── .gitignore
│   └── README.md
├── client/                  React frontend
│   ├── src/
│   │   ├── App.js           Main component (drag slider, diff viewer, CSV export)
│   │   ├── index.js         Entry point
│   │   └── styles.css       Global styles + dark mode
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   ├── .env                 API URL config
│   └── README.md
├── README.md                This file
└── .gitignore
```

---

## 🚀 Quick start

### Prerequisites

- Node.js 18+ and npm 9+
- Git

### 1. Clone & setup

```bash
git clone https://github.com/YOUR_USERNAME/pixelproof.git
cd pixelproof
```

### 2. Server (local dev)

```bash
cd server
npm install

# For local dev only — Railway uses @sparticuz/chromium automatically
npm install puppeteer

npm run dev
# → Server running on http://localhost:4000
```

### 3. Client (separate terminal)

```bash
cd client
npm install
npm start
# → App running on http://localhost:3000
# Automatically talks to http://localhost:4000
```

### 4. Open browser

```
http://localhost:3000
```

Upload a Figma export (PNG) and either:

- Enter a live URL (server screenshots it), or
- Upload a live screenshot directly

Hit "Run audit" and watch the magic happen ✨

---

## ☁️ Deploy

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Initial commit: pixelproof"
git remote add origin https://github.com/YOUR_USERNAME/pixelproof.git
git push -u origin main
```

### Step 2: Deploy server to Railway

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub**
3. Select your `pixelproof` repo
4. Railway detects it's Node and auto-runs `npm start`
5. In project settings, set **Root directory** to `/server`
6. Deploy
7. **Copy your Railway URL** — you'll need this for the client

Example: `https://pixelproof-prod.up.railway.app`

### Step 3: Deploy client to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project** → **Import Git Repository**
3. Select your `pixelproof` repo
4. Set **Root directory** to `/client`
5. Add **environment variable:**
   ```
   REACT_APP_API_URL=https://pixelproof-prod.up.railway.app
   ```
   (Replace with your actual Railway URL)
6. Deploy

**Done!** Both will auto-redeploy when you push to `main`.

---

## 📡 API reference

All endpoints served from the server (either local `http://localhost:4000` or your Railway URL).

### Health check

```http
GET /
```

Response:

```json
{
  "status": "ok",
  "service": "design-qa-server"
}
```

---

### Screenshot + diff a live URL

```http
POST /audit
```

**Request body**

```json
{
  "url": "https://your-app.com/page",
  "figmaImage": "data:image/png;base64,...",
  "threshold": 0.1
}
```

| Field        | Type   | Required | Description                                                        |
| ------------ | ------ | -------- | ------------------------------------------------------------------ |
| `url`        | string | ✅       | Live page URL to screenshot                                        |
| `figmaImage` | string | ✅       | Base64-encoded PNG/JPG (Figma export)                              |
| `threshold`  | number | —        | Pixel match sensitivity: 0 (strict) to 1 (lenient). Default: `0.1` |

**Response**

```json
{
  "mismatchPixels": 1248,
  "totalPixels": 1152000,
  "mismatchPercent": 0.11,
  "width": 1280,
  "height": 900,
  "severity": "warn",
  "diffImage": "data:image/png;base64,...",
  "liveImage": "data:image/png;base64,..."
}
```

| Field       | Description                                     |
| ----------- | ----------------------------------------------- |
| `severity`  | `"pass"` (0%) · `"warn"` (<5%) · `"fail"` (≥5%) |
| `diffImage` | PNG with red highlights on mismatched pixels    |
| `liveImage` | PNG screenshot that was taken                   |

---

### Diff two images (no screenshotting)

```http
POST /diff-only
```

Use when you already have both screenshots and just need the diff.

**Request body**

```json
{
  "figmaImage": "data:image/png;base64,...",
  "liveImage": "data:image/png;base64,...",
  "threshold": 0.1
}
```

**Response** — same as `/audit`, minus `liveImage`.

---

## 🔍 How the diff works

1. **Decode** both images (Figma export + live screenshot)
2. **Normalise** to the same dimensions using `sharp`
   - Resized to the smaller of the two (no stretching)
   - Both converted to PNG for consistency
3. **Compare** pixel-by-pixel using `pixelmatch`
   - Each pixel's RGBA values compared
   - Threshold controls sensitivity (0 = strict, 1 = lenient)
4. **Mark mismatches** in red
5. **Calculate %** = `mismatchPixels / totalPixels × 100`

### Threshold explained

- `0.0` — Ultra-strict. Even 1-shade antialiasing differences count.
- **`0.1`** — Default. Minor font rendering & subpixel antialiasing ignored.
- `0.5` — Lenient. Only major layout/color shifts flagged.

---

## 📊 Severity guide

| Severity    | Condition     | What to do                                                                                                                    |
| ----------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Pass** ✅ | 0% mismatch   | Implementation matches design perfectly                                                                                       |
| **Warn** ⚠️ | < 5% mismatch | Minor differences — likely font rendering or antialiasing. Review the diff slider to see what changed. Usually safe to merge. |
| **Fail** ❌ | ≥ 5% mismatch | Significant differences — check spacing, colors, typography against Figma. Likely needs a fix.                                |

---

## 🎨 UI features

### Drag-to-compare slider

Hover over the diff report and drag left/right to reveal Figma (left) vs live (right). Perfect for spotting layout shifts.

### Pixel diff map

Red highlights = mismatched pixels. Helps pinpoint exactly where things differ.

### Stats card

Shows:

- Total mismatch pixels
- Mismatch percentage
- Image dimensions
- Threshold used

### CSV export

One-click download of the audit report with all metrics. Great for sharing with stakeholders.

---

## 🌓 Dark mode

The client includes automatic dark mode detection using `prefers-color-scheme`. No toggle needed — it respects your system preference.

---

## 📝 Environment variables

### Client (`.env` in `/client`)

```bash
REACT_APP_API_URL=http://localhost:4000       # local dev
REACT_APP_API_URL=https://your-railway.app   # production
```

### Server (optional, in `/server`)

```bash
PORT=4000                    # Server port (default: 4000)
NODE_ENV=production          # Set for Railway
```

---

## 🐛 Troubleshooting

### "Cannot connect to server"

Make sure the server is running:

```bash
cd server && npm run dev
```

Or check your `.env` in `/client` has the correct `REACT_APP_API_URL`.

### "Screenshot timeout"

Some URLs take longer. The timeout is set to 30 seconds. If a page is super slow:

- Increase timeout in `server/index.js` line ~52: `timeout: 30000`
- Or skip screenshotting and upload the screenshot directly

### "Images mismatch size"

Both images should be the same size. If they're not, `sharp` will resize to the smaller dimensions. If that's causing issues, export Figma at the exact same viewport size as your live screenshot.

### "Puppeteer error on Railway"

Railway uses `@sparticuz/chromium` automatically (it's in `package.json`). If there are issues:

```bash
# In server/
npm install @sparticuz/chromium
```

---

## 🚧 Roadmap

- [ ] **Figma API integration** — pull frames directly (no manual export)
- [ ] **Component-level diffing** — identify which component failed
- [ ] **Storybook integration** — audit all stories automatically on push
- [ ] **CSS property diff** — font, spacing, color token comparison
- [ ] **GitHub Actions** — fail PRs when diff % exceeds threshold
- [ ] **Slack notifications** — alert team when audit fails
- [ ] **Batch audits** — diff entire design systems at once
- [ ] **Historical tracking** — watch diff % improve over time

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

For large changes, open an issue first to discuss.

---

## 📄 License

MIT — see LICENSE file for details.

---

## 📧 Support

Found a bug? Have a feature request? Open an issue on GitHub.

---

## 🙌 Credits

Built with:

- [Puppeteer](https://pptr.dev/) — headless browser automation
- [pixelmatch](https://github.com/mapbox/pixelmatch) — image diffing
- [sharp](https://sharp.pixelplumbing.com/) — image processing
- [React](https://react.dev/) — UI framework
- [Express](https://expressjs.com/) — HTTP server

---

**Happy diffing!** 🎉
