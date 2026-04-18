# Pixelproof — Server

Node.js + Express API that screenshots a live URL and diffs it against a Figma export.

## Local dev

```bash
npm install
npm run dev        # nodemon auto-reload
```

Runs on http://localhost:4000

> For local dev, also run: `npm install puppeteer` (full Chromium bundled)
> On Railway it uses @sparticuz/chromium automatically.

## Endpoints

### POST /audit
Screenshot a live URL and diff against a Figma image.

```json
{
  "url": "https://your-app.com/page",
  "figmaImage": "data:image/png;base64,...",
  "threshold": 0.1
}
```

### POST /diff-only
Diff two images directly (no screenshotting).

```json
{
  "figmaImage": "data:image/png;base64,...",
  "liveImage":  "data:image/png;base64,...",
  "threshold": 0.1
}
```

## Deploy to Railway

1. Push this `/server` folder to a GitHub repo
2. Railway → New Project → Deploy from GitHub
3. Railway auto-detects Node and runs `npm start`
4. Copy the generated URL → paste into client `.env`

## Environment variables (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| PORT     | 4000    | Server port |
