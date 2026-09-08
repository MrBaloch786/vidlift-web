"use client";

import React, { useState } from "react";

// Monetization Link
const ADSTERRA_DIRECT_LINK =
  "https://regaincocoa.com/qjav5s6mva?key=3bbb838906256a99f0797d7ab1b1c7f8";

export default function HomePage() {
  const [urlInput, setUrlInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadReadyUrl, setDownloadReadyUrl] = useState<string | null>(null);

  // Buy Me a Chai Modal States
  const [showChaiModal, setShowChaiModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"jazzcash" | "binance">("jazzcash");
  const [payerInfo, setPayerInfo] = useState("");
  const [trxId, setTrxId] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFetchLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!urlInput.trim()) {
      setErrorMessage("Please enter a valid video link.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setDownloadReadyUrl(null);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server response error. Verify app/api/download/route.ts layout.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch video stream.");

      setDownloadReadyUrl(data.downloadUrl);
      window.open(ADSTERRA_DIRECT_LINK, "_blank");
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred while fetching video.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f19", color: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header / Navbar */}
      <header style={{ borderBottom: "1px solid #1e293b", background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(12px)", sticky: "top", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href="#" style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px", color: "#ffffff", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", width: "32px", height: "32px", borderRadius: "8px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "900" }}>V</span>
            Vid<span style={{ color: "#38bdf8" }}>Lift</span>
          </a>

          <button
            type="button"
            onClick={() => setShowChaiModal(true)}
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#ffffff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "99px",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)",
              transition: "transform 0.2s"
            }}
          >
            ☕ Buy Me a Chai
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "800px", margin: "60px auto", padding: "0 20px" }}>
        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <span style={{ background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.2)", padding: "6px 16px", borderRadius: "99px", fontSize: "13px", fontWeight: "600", display: "inline-block", marginBottom: "16px" }}>
            ⚡ Fast & Unlimited Video Conversions
          </span>
          <h1 style={{ fontSize: "42px", fontWeight: "900", letterSpacing: "-1px", lineHeight: "1.2", marginBottom: "16px" }}>
            Download Videos <span style={{ background: "linear-gradient(135deg, #38bdf8, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Effortlessly</span>
          </h1>
          <p style={{ fontSize: "18px", color: "#94a3b8", maxWidth: "560px", margin: "0 auto" }}>
            Convert YouTube videos to high quality MP4 files in seconds without registration.
          </p>
        </div>

        {/* Downloader Card */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "24px", padding: "36px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)" }}>
          <form onSubmit={handleFetchLink}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ position: "relative" }}>
                <input
                  type="url"
                  placeholder="Paste video link here (e.g. https://www.youtube.com/watch?v=...)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "18px 20px",
                    borderRadius: "14px",
                    border: "2px solid #334155",
                    background: "#0f172a",
                    color: "#ffffff",
                    fontSize: "16px",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s"
                  }}
                />
              </div>
              {errorMessage && <p style={{ color: "#f87171", fontSize: "14px", marginTop: "10px", paddingLeft: "4px" }}>⚠️ {errorMessage}</p>}
            </div>

            <button
              type="submit"
              disabled={isProcessing || !urlInput.trim()}
              style={{
                width: "100%",
                padding: "16px",
                background: isProcessing ? "#475569" : "linear-gradient(135deg, #2563eb, #3b82f6)",
                color: "#ffffff",
                border: "none",
                borderRadius: "14px",
                fontWeight: "700",
                fontSize: "16px",
                cursor: isProcessing ? "not-allowed" : "pointer",
                boxShadow: isProcessing ? "none" : "0 10px 15px -3px rgba(37, 99, 235, 0.4)",
                transition: "all 0.2s"
              }}
            >
              {isProcessing ? "⏳ Extracting Video Stream..." : "Download Video MP4"}
            </button>
          </form>

          {/* Download Link Ready State */}
          {downloadReadyUrl && (
            <div style={{ marginTop: "28px", padding: "24px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "16px", textAlign: "center" }}>
              <p style={{ color: "#4ade80", fontWeight: "700", fontSize: "16px", marginBottom: "14px" }}>
                ✅ Video Link Successfully Extracted!
              </p>
              <a
                href={downloadReadyUrl}
                target="_blank"
                rel="noopener noreferrer"
                download="video.mp4"
                style={{
                  display: "inline-block",
                  padding: "14px 32px",
                  background: "#22c55e",
                  color: "#ffffff",
                  borderRadius: "12px",
                  textDecoration: "none",
                  fontWeight: "800",
                  fontSize: "16px",
                  boxShadow: "0 10px 15px -3px rgba(34, 197, 94, 0.4)"
                }}
              >
                ⬇️ Save MP4 File To Device
              </a>
            </div>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginTop: "48px" }}>
          <div style={{ background: "#1e293b", padding: "20px", borderRadius: "16px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🚀</div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>Ultra Fast</h3>
            <p style={{ fontSize: "14px", color: "#94a3b8" }}>High speed video conversion using optimized serverless APIs.</p>
          </div>
          <div style={{ background: "#1e293b", padding: "20px", borderRadius: "16px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🎬</div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>1080p HD Quality</h3>
            <p style={{ fontSize: "14px", color: "#94a3b8" }}>Preserves original resolution and audio clarity seamlessly.</p>
          </div>
          <div style={{ background: "#1e293b", padding: "20px", borderRadius: "16px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔒</div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>Secure & Free</h3>
            <p style={{ fontSize: "14px", color: "#94a3b8" }}>No registration required and zero data logging policy.</p>
          </div>
        </div>
      </main>

      {/* Buy Me a Chai Modal */}
      {showChaiModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", padding: "32px", borderRadius: "24px", maxWidth: "460px", width: "90%", position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowChaiModal(false)}
              style={{ position: "absolute", top: "20px", right: "20px", border: "none", background: "#0f172a", color: "#94a3b8", width: "32px", height: "32px", borderRadius: "50%", fontSize: "16px", cursor: "pointer" }}
            >
              ✕
            </button>

            <h2 style={{ fontSize: "24px", fontWeight: "800", margin: "0 0 6px 0" }}>☕ Buy Me a Chai</h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", margin: "0 0 24px 0" }}>Support VidLift web server bandwidth and maintenance.</p>

            {/* Payment Method Switcher */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => setPaymentMethod("jazzcash")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  border: paymentMethod === "jazzcash" ? "2px solid #3b82f6" : "1px solid #334155",
                  background: paymentMethod === "jazzcash" ? "rgba(59, 130, 246, 0.1)" : "#0f172a",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                JazzCash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("binance")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  border: paymentMethod === "binance" ? "2px solid #3b82f6" : "1px solid #334155",
                  background: paymentMethod === "binance" ? "rgba(59, 130, 246, 0.1)" : "#0f172a",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                Binance Pay
              </button>
            </div>

            {/* Payment Details Box */}
            {paymentMethod === "jazzcash" && (
              <div style={{ padding: "16px", background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>JazzCash Till ID</span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                  <strong style={{ fontSize: "20px", color: "#ffffff" }}>984279231</strong>
                  <button type="button" onClick={() => copyToClipboard("984279231", "JazzCash")} style={{ padding: "6px 12px", background: "#334155", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
                    {copiedField === "JazzCash" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            {paymentMethod === "binance" && (
              <div style={{ padding: "16px", background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", marginBottom: "20px" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>Binance Pay ID</span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                  <strong style={{ fontSize: "20px", color: "#ffffff" }}>1179481269</strong>
                  <button type="button" onClick={() => copyToClipboard("1179481269", "Binance")} style={{ padding: "6px 12px", background: "#334155", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
                    {copiedField === "Binance" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            {/* Verification Submission Form */}
            <form
              action="https://formspree.io/f/mureedhussain0110@gmail.com"
              method="POST"
              onSubmit={() => setFormSuccess(true)}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <input type="hidden" name="Payment Method" value={paymentMethod} />

              <input
                type="text"
                name="Payer Account ID"
                required
                placeholder={paymentMethod === "jazzcash" ? "Your JazzCash Mobile Number" : "Your Binance ID"}
                value={payerInfo}
                onChange={(e) => setPayerInfo(e.target.value)}
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#ffffff", fontSize: "14px" }}
              />

              <input
                type="text"
                name="Transaction ID"
                required
                placeholder="Transaction ID / TRX Reference"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#ffffff", fontSize: "14px" }}
              />

              <input
                type="text"
                name="Screenshot Proof / Notes"
                placeholder="Paste Image URL or details (Optional)"
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#ffffff", fontSize: "14px" }}
              />

              <button
                type="submit"
                style={{ padding: "14px", background: "#22c55e", color: "#ffffff", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer", marginTop: "8px" }}
              >
                Submit Payment Verification
              </button>
            </form>

            {formSuccess && (
              <p style={{ color: "#4ade80", fontSize: "13px", marginTop: "12px", textAlign: "center" }}>
                Verification sent directly to mureedhussain0110@gmail.com!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1e293b", padding: "32px 0", textAlign: "center", color: "#64748b", fontSize: "14px", marginTop: "80px" }}>
        © 2026 VidLift. All rights reserved. Free YouTube Video Downloader.
      </footer>
    </div>
  );
}
