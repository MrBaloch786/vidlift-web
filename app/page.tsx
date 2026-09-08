"use client";

import React, { useState } from "react";

// Your active Adsterra direct link
const ADSTERRA_DIRECT_LINK = "https://regaincocoa.com/qjav5s6mva?key=3bbb838906256a99f0797d7ab1b1c7f8";

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
      setErrorMessage("Please enter a video URL.");
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
        throw new Error("Server path issue. Verify app/api/download/route.ts exists.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch video.");

      // 1. Store download URL
      setDownloadReadyUrl(data.downloadUrl);

      // 2. Open Adsterra direct link in a new browser tab
      window.open(ADSTERRA_DIRECT_LINK, "_blank");
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred while fetching video.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="shell" style={{ maxWidth: "680px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <header className="nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="#" className="brand" style={{ textDecoration: "none", fontSize: "22px", fontWeight: "bold", color: "#1a202c" }}>
          VidLift
        </a>
        <button
          type="button"
          onClick={() => setShowChaiModal(true)}
          style={{
            background: "#FFDD00",
            color: "#000",
            border: "none",
            padding: "8px 16px",
            borderRadius: "20px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          ☕ Buy Me a Chai
        </button>
      </header>

      <section className="hero" style={{ textAlign: "center", margin: "30px 0" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>
          Download Videos <em>effortlessly.</em>
        </h1>
        <p style={{ color: "#4a5568" }}>Paste a video link below to convert and save directly to your device.</p>
      </section>

      <main className="converter">
        <form onSubmit={handleFetchLink}>
          <div className="link-box" style={{ marginBottom: "15px" }}>
            <input
              type="url"
              placeholder="Paste YouTube or video link here..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e0", fontSize: "16px" }}
            />
            {errorMessage && <p style={{ color: "#e53e3e", marginTop: "8px", fontSize: "14px" }}>{errorMessage}</p>}
          </div>

          <button
            type="submit"
            disabled={isProcessing || !urlInput.trim()}
            style={{
              width: "100%",
              padding: "12px",
              background: "#3182ce",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: isProcessing ? "not-allowed" : "pointer",
            }}
          >
            {isProcessing ? "Processing Video..." : "Get Download Link"}
          </button>
        </form>

        {/* Revealed Direct Download Button after Adsterra Redirect */}
        {downloadReadyUrl && (
          <div style={{ marginTop: "24px", textAlign: "center", padding: "16px", background: "#f0fff4", border: "1px solid #c6f6d5", borderRadius: "8px" }}>
            <p style={{ color: "#22543d", fontWeight: "bold", marginBottom: "12px" }}>
              ✅ Link Generated! Click below to save your file:
            </p>
            <a
              href={downloadReadyUrl}
              target="_blank"
              rel="noopener noreferrer"
              download="video.mp4"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                background: "#38a169",
                color: "#fff",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              ⬇️ Save MP4 Video File
            </a>
          </div>
        )}
      </main>

      {/* Buy Me a Chai Modal */}
      {showChaiModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "16px",
              maxWidth: "450px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowChaiModal(false)}
              style={{ position: "absolute", top: "15px", right: "15px", border: "none", background: "none", fontSize: "20px", cursor: "pointer" }}
            >
              ✕
            </button>

            <h2 style={{ marginTop: 0, fontSize: "22px" }}>☕ Buy Me a Chai</h2>
            <p style={{ fontSize: "14px", color: "#718096" }}>Support VidLift server costs via local or crypto transfer.</p>

            {/* Payment Method Switcher */}
            <div style={{ display: "flex", gap: "10px", margin: "15px 0" }}>
              <button
                type="button"
                onClick={() => setPaymentMethod("jazzcash")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border: paymentMethod === "jazzcash" ? "2px solid #3182ce" : "1px solid #e2e8f0",
                  background: paymentMethod === "jazzcash" ? "#ebf8ff" : "#fff",
                  fontWeight: "bold",
                  cursor: "pointer",
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
                  border: paymentMethod === "binance" ? "2px solid #3182ce" : "1px solid #e2e8f0",
                  background: paymentMethod === "binance" ? "#ebf8ff" : "#fff",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Binance Pay
              </button>
            </div>

            {/* JazzCash Info */}
            {paymentMethod === "jazzcash" && (
              <div style={{ padding: "12px", background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "15px" }}>
                <small style={{ color: "#718096" }}>JazzCash Till ID:</small>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                  <strong style={{ fontSize: "18px" }}>984279231</strong>
                  <button
                    type="button"
                    onClick={() => copyToClipboard("984279231", "JazzCash")}
                    style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "4px", border: "1px solid #cbd5e0", cursor: "pointer" }}
                  >
                    {copiedField === "JazzCash" ? "Copied!" : "Copy ID"}
                  </button>
                </div>
              </div>
            )}

            {/* Binance Info */}
            {paymentMethod === "binance" && (
              <div style={{ padding: "12px", background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "15px" }}>
                <small style={{ color: "#718096" }}>Binance Pay ID:</small>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                  <strong style={{ fontSize: "18px" }}>1179481269</strong>
                  <button
                    type="button"
                    onClick={() => copyToClipboard("1179481269", "Binance")}
                    style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "4px", border: "1px solid #cbd5e0", cursor: "pointer" }}
                  >
                    {copiedField === "Binance" ? "Copied!" : "Copy ID"}
                  </button>
                </div>
              </div>
            )}

            {/* Email Submission Form via Formspree */}
            <form
              action="https://formspree.io/f/mureedhussain0110@gmail.com"
              method="POST"
              onSubmit={() => setFormSuccess(true)}
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <input type="hidden" name="Payment Method" value={paymentMethod} />

              <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                {paymentMethod === "jazzcash" ? "Sender JazzCash Number" : "Sender Binance ID"}
              </label>
              <input
                type="text"
                name="Payer ID / Account"
                required
                placeholder={paymentMethod === "jazzcash" ? "03XXXXXXXXX" : "Binance ID"}
                value={payerInfo}
                onChange={(e) => setPayerInfo(e.target.value)}
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e0" }}
              />

              <label style={{ fontSize: "12px", fontWeight: "bold" }}>Transaction ID / TRX Reference</label>
              <input
                type="text"
                name="Transaction ID"
                required
                placeholder="TRX ID"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e0" }}
              />

              <label style={{ fontSize: "12px", fontWeight: "bold" }}>Screenshot URL / Payment Notes</label>
              <input
                type="text"
                name="Screenshot / Proof"
                placeholder="Paste Image URL or details"
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e0" }}
              />

              <button
                type="submit"
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  background: "#38a169",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Submit Payment Proof
              </button>
            </form>

            {formSuccess && (
              <p style={{ color: "#2f855a", fontSize: "13px", marginTop: "12px", textAlign: "center" }}>
                Submission sent directly to mureedhussain0110@gmail.com!
              </p>
            )}
          </div>
        </div>
      )}

      <footer style={{ marginTop: "40px", textAlign: "center", fontSize: "12px", color: "#a0aec0" }}>
        © 2026 VidLift. All rights reserved.
      </footer>
    </div>
  );
}
