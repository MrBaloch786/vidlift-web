"use client";

import React, { useState } from "react";
import Head from "next/head";

// Active Monetization Link
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
        throw new Error("API path issue. Verify app/api/download/route.ts layout.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch video stream.");

      // Set valid download link and trigger Adsterra tab popunder
      setDownloadReadyUrl(data.downloadUrl);
      window.open(ADSTERRA_DIRECT_LINK, "_blank");
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred while fetching video.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Structured Data Schema for Google Ranking
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "VidLift - Free Online Video Downloader",
    "url": "https://vidlift-web.vercel.app",
    "description": "Convert and download YouTube videos to MP4 format online in high quality 1080p for free.",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />

      <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, sans-serif" }}>
        {/* Navigation Bar */}
        <header style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "16px 24px" }}>
          <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <a href="#" style={{ fontSize: "24px", fontWeight: "800", color: "#2563eb", textDecoration: "none" }}>
              Vid<span style={{ color: "#0f172a" }}>Lift</span>
            </a>
            <button
              type="button"
              onClick={() => setShowChaiModal(true)}
              style={{
                background: "#facc15",
                color: "#0f172a",
                border: "none",
                padding: "10px 18px",
                borderRadius: "9999px",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
              }}
            >
              ☕ Buy Me a Chai
            </button>
          </div>
        </header>

        {/* Hero & Form Section */}
        <main style={{ maxWidth: "800px", margin: "40px auto", padding: "0 20px" }}>
          <section style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1 style={{ fontSize: "36px", fontWeight: "800", tracking: "-0.025em", marginBottom: "12px" }}>
              Free Online Video Downloader
            </h1>
            <p style={{ fontSize: "18px", color: "#64748b" }}>
              Convert YouTube videos to MP4 in 1080p Full HD instantly. Fast, free, and secure.
            </p>
          </section>

          {/* Converter Card */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <form onSubmit={handleFetchLink}>
              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="video-url" style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>
                  Paste Video URL Below
                </label>
                <input
                  id="video-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "16px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                {errorMessage && <p style={{ color: "#dc2626", fontSize: "14px", marginTop: "8px" }}>{errorMessage}</p>}
              </div>

              <button
                type="submit"
                disabled={isProcessing || !urlInput.trim()}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: isProcessing ? "#94a3b8" : "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "16px",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  transition: "background 0.2s"
                }}
              >
                {isProcessing ? "Extracting Video Stream..." : "Download Video MP4"}
              </button>
            </form>

            {/* Direct Download Action Button */}
            {downloadReadyUrl && (
              <div style={{ marginTop: "24px", padding: "20px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", textAlign: "center" }}>
                <p style={{ color: "#166534", fontWeight: "700", marginBottom: "12px" }}>
                  ✅ Link Successfully Generated!
                </p>
                <a
                  href={downloadReadyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download="video.mp4"
                  style={{
                    display: "inline-block",
                    padding: "12px 28px",
                    background: "#16a34a",
                    color: "#ffffff",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: "700",
                    fontSize: "16px"
                  }}
                >
                  ⬇️ Save MP4 File
                </a>
              </div>
            )}
          </div>

          {/* SEO Content & Keywords Section */}
          <section style={{ marginTop: "48px", borderTop: "1px solid #e2e8f0", paddingTop: "32px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "12px" }}>
              How to Download YouTube Videos Online
            </h2>
            <ol style={{ paddingLeft: "20px", color: "#475569", lineHeight: "1.7" }}>
              <li>Copy the video link from YouTube or any supported media platform.</li>
              <li>Paste the URL link into the VidLift converter search box above.</li>
              <li>Click <strong>Download Video MP4</strong> to generate your direct download link.</li>
            </ol>

            <h3 style={{ fontSize: "18px", fontWeight: "700", marginTop: "24px", marginBottom: "8px" }}>
              Key Features of VidLift Downloader
            </h3>
            <ul style={{ paddingLeft: "20px", color: "#475569", lineHeight: "1.7" }}>
              <li><strong>High Quality Downloads:</strong> Save videos in 1080p Full HD, 720p HD, or MP3 audio.</li>
              <li><strong>No Registration Required:</strong> Unlimited conversions without accounts or software installation.</li>
              <li><strong>Multi-Device Compatibility:</strong> Works on Windows, Mac, Android, iOS, and Linux browsers.</li>
            </ul>
          </section>
        </main>

        {/* Buy Me a Chai Modal */}
        {showChaiModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "#ffffff", padding: "28px", borderRadius: "16px", maxWidth: "440px", width: "90%", position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowChaiModal(false)}
                style={{ position: "absolute", top: "16px", right: "16px", border: "none", background: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>

              <h2 style={{ fontSize: "22px", fontWeight: "800", margin: "0 0 6px 0" }}>☕ Buy Me a Chai</h2>
              <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px 0" }}>Support VidLift server bandwidth and maintenance.</p>

              {/* Payment Switcher */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("jazzcash")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: paymentMethod === "jazzcash" ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    background: paymentMethod === "jazzcash" ? "#eff6ff" : "#ffffff",
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
                    padding: "10px",
                    borderRadius: "8px",
                    border: paymentMethod === "binance" ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    background: paymentMethod === "binance" ? "#eff6ff" : "#ffffff",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  Binance Pay
                </button>
              </div>

              {/* ID Cards */}
              {paymentMethod === "jazzcash" && (
                <div style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>JazzCash Till ID</span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <strong style={{ fontSize: "18px" }}>984279231</strong>
                    <button type="button" onClick={() => copyToClipboard("984279231", "JazzCash")} style={{ padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}>
                      {copiedField === "JazzCash" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {paymentMethod === "binance" && (
                <div style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Binance Pay ID</span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <strong style={{ fontSize: "18px" }}>1179481269</strong>
                    <button type="button" onClick={() => copyToClipboard("1179481269", "Binance")} style={{ padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}>
                      {copiedField === "Binance" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {/* Formspree Submission */}
              <form
                action="https://formspree.io/f/mureedhussain0110@gmail.com"
                method="POST"
                onSubmit={() => setFormSuccess(true)}
                style={{ display: "flex", flexDirection: "column", gap: "10px" }}
              >
                <input type="hidden" name="Payment Method" value={paymentMethod} />

                <input
                  type="text"
                  name="Payer Account ID"
                  required
                  placeholder={paymentMethod === "jazzcash" ? "Your JazzCash Number" : "Your Binance ID"}
                  value={payerInfo}
                  onChange={(e) => setPayerInfo(e.target.value)}
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />

                <input
                  type="text"
                  name="Transaction ID"
                  required
                  placeholder="Transaction ID / TRX Reference"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />

                <input
                  type="text"
                  name="Proof / Notes"
                  placeholder="Screenshot Link or Notes (Optional)"
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />

                <button
                  type="submit"
                  style={{ padding: "12px", background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", marginTop: "8px" }}
                >
                  Submit Payment Verification
                </button>
              </form>

              {formSuccess && (
                <p style={{ color: "#16a34a", fontSize: "12px", marginTop: "8px", textAlign: "center" }}>
                  Verification details sent to mureedhussain0110@gmail.com
                </p>
              )}
            </div>
          </div>
        )}

        <footer style={{ borderTop: "1px solid #e2e8f0", padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
          © 2026 VidLift. All rights reserved. Free YouTube Video Downloader.
        </footer>
      </div>
    </>
  );
}
