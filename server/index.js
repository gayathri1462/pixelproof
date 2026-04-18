const express = require("express");
const cors = require("cors");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch");
const sharp = require("sharp");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// Health check
app.get("/", (req, res) => res.json({ status: "ok", service: "design-qa-server" }));

// Get a headless browser instance (Railway + local compatible)
const getBrowser = async () => {
  let browser;
  try {
    // Try @sparticuz/chromium (works on Railway/Lambda)
    const chromium = require("@sparticuz/chromium");
    const puppeteer = require("puppeteer-core");
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: "new",
    });
  } catch {
    // Fallback: local puppeteer (for local dev with `npm i puppeteer`)
    const puppeteer = require("puppeteer");
    browser = await puppeteer.launch({ headless: "new" });
  }
  return browser;
};

// Resize both images to the same dimensions for accurate diffing
const normalizeImages = async (buf1, buf2) => {
  const meta1 = await sharp(buf1).metadata();
  const meta2 = await sharp(buf2).metadata();

  const width = Math.min(meta1.width, meta2.width);
  const height = Math.min(meta1.height, meta2.height);

  const norm1 = await sharp(buf1).resize(width, height, { fit: "cover" }).png().toBuffer();
  const norm2 = await sharp(buf2).resize(width, height, { fit: "cover" }).png().toBuffer();

  return { norm1, norm2, width, height };
};

// POST /audit
// Body: { url: string, figmaImage: base64string, threshold?: 0-1 }
app.post("/audit", async (req, res) => {
  const { url, figmaImage, threshold = 0.1 } = req.body;

  if (!url || !figmaImage) {
    return res.status(400).json({ error: "url and figmaImage are required" });
  }

  let browser;
  try {
    // 1. Screenshot the live URL
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait a tick for fonts / animations to settle
    await new Promise(r => setTimeout(r, 800));

    const screenshotBuffer = await page.screenshot({ fullPage: false, type: "png" });
    await browser.close();
    browser = null;

    // 2. Decode Figma base64 image
    const figmaBuffer = Buffer.from(
      figmaImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
      "base64"
    );

    // 3. Normalise both to same size
    const { norm1, norm2, width, height } = await normalizeImages(figmaBuffer, screenshotBuffer);

    // 4. Pixel diff
    const img1 = PNG.sync.read(norm1);
    const img2 = PNG.sync.read(norm2);
    const diffPng = new PNG({ width, height });

    const mismatch = pixelmatch(img1.data, img2.data, diffPng.data, width, height, {
      threshold: parseFloat(threshold),
      includeAA: true,
    });

    const totalPixels = width * height;
    const mismatchPct = ((mismatch / totalPixels) * 100).toFixed(2);

    // 5. Build response
    const diffBase64 = "data:image/png;base64," + PNG.sync.write(diffPng).toString("base64");
    const liveBase64 = "data:image/png;base64," + screenshotBuffer.toString("base64");

    res.json({
      mismatchPixels: mismatch,
      totalPixels,
      mismatchPercent: parseFloat(mismatchPct),
      width,
      height,
      diffImage: diffBase64,
      liveImage: liveBase64,
      severity: mismatch === 0 ? "pass" : parseFloat(mismatchPct) < 5 ? "warn" : "fail",
    });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /diff-only
// Body: { figmaImage: base64, liveImage: base64, threshold?: 0-1 }
// Use this if you already have both screenshots
app.post("/diff-only", async (req, res) => {
  const { figmaImage, liveImage, threshold = 0.1 } = req.body;

  if (!figmaImage || !liveImage) {
    return res.status(400).json({ error: "figmaImage and liveImage are required" });
  }

  try {
    const buf1 = Buffer.from(figmaImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""), "base64");
    const buf2 = Buffer.from(liveImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""), "base64");

    const { norm1, norm2, width, height } = await normalizeImages(buf1, buf2);

    const img1 = PNG.sync.read(norm1);
    const img2 = PNG.sync.read(norm2);
    const diffPng = new PNG({ width, height });

    const mismatch = pixelmatch(img1.data, img2.data, diffPng.data, width, height, {
      threshold: parseFloat(threshold),
      includeAA: true,
    });

    const totalPixels = width * height;
    const mismatchPct = ((mismatch / totalPixels) * 100).toFixed(2);
    const diffBase64 = "data:image/png;base64," + PNG.sync.write(diffPng).toString("base64");

    res.json({
      mismatchPixels: mismatch,
      totalPixels,
      mismatchPercent: parseFloat(mismatchPct),
      width,
      height,
      diffImage: diffBase64,
      severity: mismatch === 0 ? "pass" : parseFloat(mismatchPct) < 5 ? "warn" : "fail",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Design QA server running on port ${PORT}`));
