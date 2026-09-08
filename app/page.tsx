"use client";

import React, { useState } from "react";

interface VideoOption {
  qualityLabel: string;
  url: string;
  container: string;
}

export default function HomePage() {
  const [urlInput, setUrlInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoData, setVideoData] = useState<{
    title: string;
    thumbnail: string;
    videoOptions: VideoOption[];
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!urlInput.trim()) {
      setErrorMessage("Please enter a YouTube video URL.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setVideoData(null);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch video.");

      setVideoData(data);
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="shell">
      <header className="nav">
        <a href="#" className="brand">
          <div className="logo-mark">
            <span>V</span>
          </div>
          <strong>VidLift</strong>
        </a>
        <div className="safe">
          <span>🔒 Safe Downloader</span>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <span /> FAST & FREE
        </div>
        <h1>
          Download Videos <em>effortlessly.</em>
        </h1>
        <p>Paste a YouTube link below to convert and download.</p>
      </section>

      <main className="converter" style={{ margin: "0 auto" }}>
        <form onSubmit={handleSubmit}>
          <div className="link-box">
            <label htmlFor="video-url">YouTube Video URL</label>
            <div>
              <span>🔗</span>
              <input
                id="video-url"
                type="url"
                placeholder="Paste YouTube video link here..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
            {errorMessage && <p className="link-error">{errorMessage}</p>}
          </div>

          <button
            type="submit"
            className="primary"
            disabled={isProcessing || !urlInput.trim()}
          >
            {isProcessing ? "Processing Video..." : "Get Download Links"}
          </button>
        </form>

        {/* Video Download Section */}
        {videoData && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              background: "#fff",
            }}
          >
            {videoData.thumbnail && (
              <img
                src={videoData.thumbnail}
                alt={videoData.title}
                style={{
                  width: "100%",
                  maxHeight: "220px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  marginBottom: "12px",
                }}
              />
            )}
            <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>
              {videoData.title}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {videoData.videoOptions.map((opt, index) => (
                <a
                  key={index}
                  href={opt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "#f0f4f1",
                    borderRadius: "10px",
                    textDecoration: "none",
                    color: "var(--ink)",
                    fontWeight: "bold",
                  }}
                >
                  <span>Download MP4 ({opt.qualityLabel})</span>
                  <span>⬇️ Save</span>
                </a>
              ))}
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                marginTop: "12px",
                textAlign: "center",
              }}
            >
              Tip: If the video plays in the browser, right-click "Save" and choose <strong>Save Link As...</strong>
            </p>
          </div>
        )}
      </main>

      <footer>
        <p>© 2026 VidLift. All rights reserved.</p>
      </footer>
    </div>
  );
}
