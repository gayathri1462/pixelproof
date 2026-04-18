const express = require("express");
const cors = require("cors");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch");
const sharp = require("sharp");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// Error handler for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }
  next(err);
});

// Health check
app.get("/", (req, res) =>
  res.json({ status: "ok", service: "design-qa-server-enhanced" }),
);

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

  const norm1 = await sharp(buf1)
    .resize(width, height, { fit: "cover" })
    .png()
    .toBuffer();
  const norm2 = await sharp(buf2)
    .resize(width, height, { fit: "cover" })
    .png()
    .toBuffer();

  return { norm1, norm2, width, height };
};

// Extract CSS properties from DOM elements
const extractCSSProperties = async (page) => {
  return await page.evaluate(() => {
    const elements = [];
    const allElements = document.querySelectorAll("*");

    for (const el of allElements) {
      const rect = el.getBoundingClientRect();
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top >= 0 &&
        rect.left >= 0
      ) {
        const computedStyle = window.getComputedStyle(el);
        const text = el.textContent?.trim().substring(0, 50) || "";

        // Only include elements with meaningful content or specific tags
        if (
          text ||
          [
            "button",
            "input",
            "select",
            "textarea",
            "a",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
          ].includes(el.tagName.toLowerCase())
        ) {
          elements.push({
            tag: el.tagName.toLowerCase(),
            text: text,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            styles: {
              color: computedStyle.color,
              backgroundColor: computedStyle.backgroundColor,
              fontSize: computedStyle.fontSize,
              fontWeight: computedStyle.fontWeight,
              fontFamily: computedStyle.fontFamily,
              lineHeight: computedStyle.lineHeight,
              borderRadius: computedStyle.borderRadius,
              padding: computedStyle.padding,
              margin: computedStyle.margin,
              letterSpacing: computedStyle.letterSpacing,
              textAlign: computedStyle.textAlign,
              display: computedStyle.display,
              position: computedStyle.position,
            },
          });
        }
      }
    }

    return elements;
  });
};

// Compare CSS properties and generate issues
const compareCSSProperties = (liveElements, designSpec) => {
  const issues = [];

  // For each design element, find closest match in live elements
  for (const designEl of designSpec) {
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const liveEl of liveElements) {
      // Simple matching based on tag and text similarity
      if (liveEl.tag === designEl.tag) {
        const textSimilarity =
          designEl.text && liveEl.text
            ? levenshteinDistance(
                designEl.text.toLowerCase(),
                liveEl.text.toLowerCase(),
              ) / Math.max(designEl.text.length, liveEl.text.length)
            : 0;

        if (textSimilarity < 0.3) {
          // 70% text match threshold
          const distance = Math.sqrt(
            Math.pow(liveEl.x - (designEl.x || 0), 2) +
              Math.pow(liveEl.y - (designEl.y || 0), 2),
          );

          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = liveEl;
          }
        }
      }
    }

    if (bestMatch) {
      // Compare styles
      for (const [prop, designValue] of Object.entries(designEl.styles || {})) {
        const liveValue = bestMatch.styles[prop];

        if (liveValue !== designValue) {
          const issue = {
            type: prop.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase()),
            element: `${bestMatch.tag}${bestMatch.text ? ` "${bestMatch.text}"` : ""}`,
            design: designValue,
            live: liveValue,
            severity: getSeverityForProperty(prop, designValue, liveValue),
          };

          // Add delta for numeric properties
          if (
            prop.includes("weight") ||
            prop.includes("Size") ||
            prop.includes("spacing")
          ) {
            issue.delta = calculateDelta(designValue, liveValue);
          }

          issues.push(issue);
        }
      }
    }
  }

  return issues;
};

// Simple Levenshtein distance for text matching
const levenshteinDistance = (str1, str2) => {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
};

// Determine severity based on property type and difference
const getSeverityForProperty = (prop, design, live) => {
  if (prop.includes("color") || prop.includes("Color")) {
    // Color differences - check RGB delta
    const designRgb = parseRgb(design);
    const liveRgb = parseRgb(live);
    if (designRgb && liveRgb) {
      const delta = Math.sqrt(
        Math.pow(designRgb.r - liveRgb.r, 2) +
          Math.pow(designRgb.g - liveRgb.g, 2) +
          Math.pow(designRgb.b - liveRgb.b, 2),
      );
      return delta > 15 ? "fail" : "warn";
    }
  }

  if (prop.includes("weight")) {
    const delta = Math.abs(parseInt(design) - parseInt(live));
    return delta >= 100 ? "fail" : "warn";
  }

  if (prop.includes("Size")) {
    const delta = Math.abs(parseFloat(design) - parseFloat(live));
    return delta >= 2 ? "fail" : "warn";
  }

  // Default to warn for any difference
  return "warn";
};

// Calculate delta for numeric properties
const calculateDelta = (design, live) => {
  const designNum = parseFloat(design);
  const liveNum = parseFloat(live);
  if (!isNaN(designNum) && !isNaN(liveNum)) {
    return (liveNum - designNum).toString();
  }
  return null;
};

// Parse RGB color string
const parseRgb = (colorStr) => {
  const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
    };
  }
  return null;
};

// POST /audit
// Body: { url: string, figmaImage: base64string, threshold?: 0-1, designSpec?: array }
app.post("/audit", async (req, res) => {
  const { url, figmaImage, threshold = 0.1, designSpec } = req.body;

  if (!url || !figmaImage) {
    return res.status(400).json({ error: "url and figmaImage are required" });
  }

  let browser;
  try {
    // 1. Screenshot the live URL and extract CSS properties
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait a tick for fonts / animations to settle
    await new Promise((r) => setTimeout(r, 800));

    const screenshotBuffer = await page.screenshot({
      fullPage: false,
      type: "png",
    });

    // Extract CSS properties if design spec is provided
    let cssIssues = [];
    let liveElements = [];
    if (designSpec && Array.isArray(designSpec)) {
      liveElements = await extractCSSProperties(page);
      cssIssues = compareCSSProperties(liveElements, designSpec);
    }

    await browser.close();
    browser = null;

    // 2. Decode Figma base64 image
    const figmaBuffer = Buffer.from(
      figmaImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
      "base64",
    );

    // 3. Normalise both to same size
    const { norm1, norm2, width, height } = await normalizeImages(
      figmaBuffer,
      screenshotBuffer,
    );

    // 4. Pixel diff
    const img1 = PNG.sync.read(norm1);
    const img2 = PNG.sync.read(norm2);
    const diffPng = new PNG({ width, height });

    const mismatch = pixelmatch(
      img1.data,
      img2.data,
      diffPng.data,
      width,
      height,
      {
        threshold: parseFloat(threshold),
        includeAA: true,
      },
    );

    const totalPixels = width * height;
    const mismatchPct = ((mismatch / totalPixels) * 100).toFixed(2);

    // 5. Build response
    const diffBase64 =
      "data:image/png;base64," + PNG.sync.write(diffPng).toString("base64");
    const liveBase64 =
      "data:image/png;base64," + screenshotBuffer.toString("base64");

    const response = {
      mismatchPixels: mismatch,
      totalPixels,
      mismatchPercent: parseFloat(mismatchPct),
      width,
      height,
      diffImage: diffBase64,
      liveImage: liveBase64,
      severity:
        mismatch === 0 ? "pass" : parseFloat(mismatchPct) < 5 ? "warn" : "fail",
    };

    // Add CSS issues if available
    if (cssIssues.length > 0) {
      response.cssIssues = cssIssues;
      response.cssIssueCount = cssIssues.length;
      response.cssSeverity = cssIssues.some(
        (issue) => issue.severity === "fail",
      )
        ? "fail"
        : cssIssues.some((issue) => issue.severity === "warn")
          ? "warn"
          : "pass";
    }

    res.json(response);
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
    return res
      .status(400)
      .json({ error: "figmaImage and liveImage are required" });
  }

  try {
    const buf1 = Buffer.from(
      figmaImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
      "base64",
    );
    const buf2 = Buffer.from(
      liveImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
      "base64",
    );

    const { norm1, norm2, width, height } = await normalizeImages(buf1, buf2);

    const img1 = PNG.sync.read(norm1);
    const img2 = PNG.sync.read(norm2);
    const diffPng = new PNG({ width, height });

    const mismatch = pixelmatch(
      img1.data,
      img2.data,
      diffPng.data,
      width,
      height,
      {
        threshold: parseFloat(threshold),
        includeAA: true,
      },
    );

    const totalPixels = width * height;
    const mismatchPct = ((mismatch / totalPixels) * 100).toFixed(2);
    const diffBase64 =
      "data:image/png;base64," + PNG.sync.write(diffPng).toString("base64");

    res.json({
      mismatchPixels: mismatch,
      totalPixels,
      mismatchPercent: parseFloat(mismatchPct),
      width,
      height,
      diffImage: diffBase64,
      severity:
        mismatch === 0 ? "pass" : parseFloat(mismatchPct) < 5 ? "warn" : "fail",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({
    error: err.message || "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res
    .status(404)
    .json({ error: `Endpoint ${req.method} ${req.path} not found` });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Design QA server (ENHANCED) running on port ${PORT}`);
  console.log(`📝 Health check: GET http://localhost:${PORT}/`);
  console.log(`🖼️  Audit endpoint: POST http://localhost:${PORT}/audit`);
  console.log(`🔄 Diff-only endpoint: POST http://localhost:${PORT}/diff-only`);
  console.log(`🎨 CSS property diffing: ENABLED`);
});
