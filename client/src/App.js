import { useState, useRef, useCallback } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:4000";

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const severity = (pct) => (pct === 0 ? "pass" : pct < 5 ? "warn" : "fail");
const severityLabel = { pass: "Pass", warn: "Warning", fail: "Fail" };

const badgeStyle = (sev) => ({
  display: "inline-flex",
  alignItems: "center",
  height: 20,
  padding: "0 8px",
  borderRadius: 10,
  fontSize: 11,
  fontWeight: 600,
  background: `var(--${sev}-bg)`,
  color: `var(--${sev})`,
  letterSpacing: ".03em",
  textTransform: "uppercase",
});

// ─── UploadZone ───────────────────────────────────────────────────────────────
function UploadZone({ label, value, onChange }) {
  const input = useRef();
  const [drag, setDrag] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-2)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
        }}
      >
        {label}
      </span>
      <div
        onClick={() => input.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        style={{
          border: `1.5px dashed ${drag ? "var(--accent)" : "var(--border-strong)"}`,
          borderRadius: "var(--radius)",
          background: drag
            ? "var(--accent-bg)"
            : value
              ? "transparent"
              : "var(--surface)",
          cursor: "pointer",
          overflow: "hidden",
          minHeight: 140,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color .15s, background .15s",
        }}
      >
        {value ? (
          <img
            src={value}
            alt="preview"
            style={{
              width: "100%",
              maxHeight: 200,
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "1.5rem",
              color: "var(--text-3)",
            }}
          >
            <UploadIcon />
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Click or drag image here
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>PNG or JPG</div>
          </div>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}

// ─── DiffSlider ───────────────────────────────────────────────────────────────
function DiffSlider({ figmaImage, liveImage, diffImage }) {
  const [pos, setPos] = useState(50);
  const container = useRef();

  const onMouseMove = (e) => {
    const rect = container.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setPos(Math.round(x * 100));
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-2)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          marginBottom: 8,
        }}
      >
        Diff slider — drag to compare
      </div>
      <div
        ref={container}
        onMouseMove={onMouseMove}
        onTouchMove={(e) => {
          const t = e.touches[0];
          const rect = container.current.getBoundingClientRect();
          setPos(
            Math.round(
              Math.max(0, Math.min(1, (t.clientX - rect.left) / rect.width)) *
                100,
            ),
          );
        }}
        style={{
          position: "relative",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          border: "0.5px solid var(--border)",
          cursor: "col-resize",
          userSelect: "none",
          lineHeight: 0,
        }}
      >
        <img
          src={liveImage}
          alt="live"
          style={{ width: "100%", display: "block" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            width: `${pos}%`,
          }}
        >
          <img
            src={figmaImage}
            alt="figma"
            style={{
              width: `${10000 / pos}%`,
              maxWidth: "none",
              display: "block",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${pos}%`,
            width: 2,
            background: "white",
            transform: "translateX(-50%)",
            boxShadow: "0 0 0 1px rgba(0,0,0,.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 10,
            background: "rgba(0,0,0,.6)",
            color: "#fff",
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          Figma
        </div>
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            background: "rgba(0,0,0,.6)",
            color: "#fff",
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          Live
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-2)",
            textTransform: "uppercase",
            letterSpacing: ".06em",
            marginBottom: 6,
          }}
        >
          Pixel diff map
        </div>
        <img
          src={diffImage}
          alt="diff"
          style={{
            width: "100%",
            borderRadius: "var(--radius)",
            border: "0.5px solid var(--border)",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sev }) {
  return (
    <div
      style={{
        background: sev ? `var(--${sev}-bg)` : "var(--surface)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: sev ? `var(--${sev})` : "var(--text)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [url, setUrl] = useState("");
  const [figmaImage, setFigmaImage] = useState(null);
  const [liveImage, setLiveImage] = useState(null);
  const [threshold, setThreshold] = useState(0.1);
  const [mode, setMode] = useState("url"); // "url" | "upload"
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const tick = (pct, label) => {
    setProgress(pct);
    setProgressLabel(label);
  };

  const runAudit = async () => {
    setError(null);
    setResult(null);

    if (!figmaImage) return setError("Please upload a Figma design image.");
    if (mode === "url" && !url) return setError("Please enter a live URL.");
    if (mode === "upload" && !liveImage)
      return setError("Please upload a live screenshot.");

    setLoading(true);

    try {
      let data;

      if (mode === "url") {
        tick(15, "Launching browser...");
        await wait(400);
        tick(35, "Loading live URL...");
        await wait(400);
        tick(55, "Taking screenshot...");

        const res = await fetch(`${API}/audit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, figmaImage, threshold }),
        });

        tick(80, "Running pixel diff...");
        await wait(300);
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Server error");
      } else {
        tick(30, "Uploading images...");
        await wait(400);
        tick(60, "Running pixel diff...");

        const res = await fetch(`${API}/diff-only`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ figmaImage, liveImage, threshold }),
        });

        tick(85, "Generating report...");
        await wait(300);
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Server error");

        data.liveImage = liveImage;
      }

      tick(100, "Done!");
      await wait(300);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setProgress(0);
      setProgressLabel("");
    }
  };

  const exportCSV = () => {
    if (!result) return;
    const rows = [
      ["Metric", "Value"],
      ["Mismatch pixels", result.mismatchPixels],
      ["Total pixels", result.totalPixels],
      ["Mismatch %", result.mismatchPercent],
      ["Severity", result.severity],
      ["Image width", result.width],
      ["Image height", result.height],
      ["URL", url],
      ["Threshold", threshold],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "audit-report.csv";
    a.click();
  };

  return (
    <div style={{ minHeight: "100vh", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "var(--accent-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AuditIcon />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>
              Pixel-Perfect Auditor
            </h1>
          </div>
          <p style={{ color: "var(--text-2)", fontSize: 14 }}>
            Compare Figma designs against your live UI and get a pixel diff
            report.
          </p>
        </div>

        {/* Inputs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <UploadZone
            label="Figma design export"
            value={figmaImage}
            onChange={setFigmaImage}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-2)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              Live UI
            </span>
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              {["url", "upload"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    height: 30,
                    padding: "0 12px",
                    fontSize: 13,
                    borderRadius: "var(--radius-sm)",
                    border: "0.5px solid var(--border-strong)",
                    background: mode === m ? "var(--text)" : "transparent",
                    color: mode === m ? "var(--bg)" : "var(--text-2)",
                    fontWeight: mode === m ? 500 : 400,
                    transition: "all .15s",
                  }}
                >
                  {m === "url" ? "Screenshot URL" : "Upload screenshot"}
                </button>
              ))}
            </div>
            {mode === "url" ? (
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-app.com/page"
                style={{
                  height: 40,
                  padding: "0 12px",
                  fontSize: 14,
                  border: "0.5px solid var(--border-strong)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  outline: "none",
                }}
                onKeyDown={(e) => e.key === "Enter" && runAudit()}
              />
            ) : (
              <UploadZone label="" value={liveImage} onChange={setLiveImage} />
            )}
          </div>
        </div>

        {/* Config row */}
        <div
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "1rem 1.25rem",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-2)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              marginBottom: 12,
            }}
          >
            Tolerance settings
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 20,
            }}
          >
            <ConfigSlider
              label="Pixel threshold"
              min={0}
              max={0.5}
              step={0.05}
              value={threshold}
              format={(v) => v.toFixed(2)}
              onChange={setThreshold}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                Diff highlight color
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["Red (default)", "Blue", "Yellow"].map((c) => (
                  <span
                    key={c}
                    style={{
                      fontSize: 12,
                      background: "var(--bg)",
                      border: "0.5px solid var(--border)",
                      borderRadius: 4,
                      padding: "2px 8px",
                      color: "var(--text-2)",
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                Severity thresholds
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                <span style={{ color: "var(--pass)" }}>■</span> Pass: 0% &nbsp;
                <span style={{ color: "var(--warn)" }}>■</span> Warn: &lt;5%
                &nbsp;
                <span style={{ color: "var(--fail)" }}>■</span> Fail: ≥5%
              </div>
            </div>
          </div>
        </div>

        {/* Run button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          {error && (
            <div
              style={{
                fontSize: 13,
                color: "var(--fail)",
                background: "var(--fail-bg)",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {error}
            </div>
          )}
          {!error && (
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>
              {figmaImage ? "Figma loaded" : "Waiting for Figma image"} ·{" "}
              {mode === "url"
                ? url
                  ? "URL ready"
                  : "Waiting for URL"
                : liveImage
                  ? "Live screenshot loaded"
                  : "Waiting for screenshot"}
            </div>
          )}
          <button
            onClick={runAudit}
            disabled={loading}
            style={{
              height: 40,
              padding: "0 24px",
              fontSize: 14,
              fontWeight: 500,
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: loading ? "var(--border-strong)" : "var(--accent)",
              color: loading ? "var(--text-3)" : "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background .15s",
            }}
          >
            {loading ? progressLabel || "Running..." : "Run audit"}
          </button>
        </div>

        {/* Progress */}
        {loading && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                height: 4,
                background: "var(--border)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "var(--accent)",
                  borderRadius: 2,
                  transition: "width .4s ease",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                textAlign: "center",
                marginTop: 6,
              }}
            >
              {progressLabel}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "1.25rem",
              marginTop: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 500 }}>Audit report</span>
                <span style={badgeStyle(result.severity)}>
                  {severityLabel[result.severity]}
                </span>
              </div>
              <button
                onClick={exportCSV}
                style={{
                  height: 30,
                  padding: "0 12px",
                  fontSize: 13,
                  borderRadius: "var(--radius-sm)",
                  border: "0.5px solid var(--border-strong)",
                  background: "transparent",
                  color: "var(--text-2)",
                }}
              >
                Export CSV
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <StatCard
                label="Mismatch pixels"
                value={result.mismatchPixels.toLocaleString()}
                sev={result.severity}
              />
              <StatCard
                label="Mismatch %"
                value={`${result.mismatchPercent}%`}
                sev={result.severity}
              />
              <StatCard
                label="Image size"
                value={`${result.width}×${result.height}`}
              />
              <StatCard label="Threshold" value={threshold.toFixed(2)} />
            </div>

            {/* Insight text */}
            <div
              style={{
                background: `var(--${result.severity}-bg)`,
                border: `0.5px solid var(--${result.severity})`,
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                marginBottom: 20,
                fontSize: 13,
                color: `var(--${result.severity})`,
              }}
            >
              {result.severity === "pass" &&
                "Perfect match — no pixel differences detected."}
              {result.severity === "warn" &&
                `Minor differences detected (${result.mismatchPercent}%). Review the diff map — may be font rendering or anti-aliasing.`}
              {result.severity === "fail" &&
                `Significant differences detected (${result.mismatchPercent}%). Check spacing, colors, and typography against Figma tokens.`}
            </div>

            {/* Slider + diff */}
            {result.liveImage && result.diffImage && (
              <DiffSlider
                figmaImage={figmaImage}
                liveImage={result.liveImage}
                diffImage={result.diffImage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tiny utils ───────────────────────────────────────────────────────────────
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function ConfigSlider({ label, min, max, step, value, format, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V8m0 0-3 3m3-3 3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806A3.42 3.42 0 0119.5 7.5a3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946A3.42 3.42 0 0116.165 19.303a3.42 3.42 0 01-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 01-1.946-.806 3.42 3.42 0 01-2.794-2.794 3.42 3.42 0 01-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946A3.42 3.42 0 017.835 4.697z" />
    </svg>
  );
}
