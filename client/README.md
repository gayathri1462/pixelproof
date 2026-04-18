# Design QA — Client

React frontend for the pixel-perfect auditor.

## Setup

1. Copy `.env` and set your Railway URL:

```bash
cp .env .env.local
# Edit .env.local:
REACT_APP_API_URL=https://your-app.up.railway.app
```

2. Install and run:

```bash
npm install
npm start
```

Opens at http://localhost:3000

## Deploy to Vercel

```bash
npm run build
# Then import /client into Vercel
# Set environment variable: REACT_APP_API_URL=https://your-app.up.railway.app
```

## Features

- Upload Figma export (PNG/JPG) or drag & drop
- Screenshot any live URL via backend, OR upload a live screenshot directly
- Configurable pixel threshold slider
- Side-by-side diff slider — drag to reveal Figma vs live
- Pixel diff map (red highlights = mismatches)
- Pass / Warn / Fail severity with % breakdown
- Export report as CSV
