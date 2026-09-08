"use client";

import React, { useState, useRef } from "react";

export default function HomePage() {
  const [urlInput, setUrlInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!urlInput.trim()) {
      setErrorMessage("Please enter a YouTube URL.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setStatusText("Analyzing video link...");

    try {
      // 1. Get raw video URL from API
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse video.");

      setStatusText("Downloading video file directly...");

      // 2. Fetch video binary payload via XHR blob to bypass tab redirects
      const xhr = new XMLHttpRequest();
      xhr.open("GET", data.downloadUrl, true);
      xhr.responseType = "blob";

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setStatusText(`Downloading: ${percent}%`);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const blob = xhr.response;
          const blobUrl = window.URL.createObjectURL(blob);

          // 3. Trigger immediate local file save in browser
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `${data.title || "video"}.mp4`;
          document.body.appendChild(link);
          link.click();

          // Cleanup
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          setStatusText("Download complete!");
          setIsProcessing(false);
        } else {
          // Fallback if CORS blocks client fetch: trigger direct download link
          triggerFallbackDownload(data.downloadUrl, data.title);
        }
      };

      xhr.onerror = () => {
        triggerFallbackDownload(data.downloadUrl, data.title);
      };

      xhr.send();
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred.");
      setIsProcessing(false);
    }
  };

  const triggerFallbackDownload = (downloadUrl: string, title: string) => {
    setStatusText("Preparing direct save...");
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.setAttribute("download", `${title}.mp4`);
    a.setAttribute("target", "_self");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setIsProcessing(false);
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
          <span>🔒 Direct Downloader</span>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <span /> FAST & FREE
        </div>
        <h1>
          Download Videos <em>effortlessly.</em>
        </h1>
        <p>Paste a YouTube URL below to download directly to your device.</p>
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
                placeholder="Paste YouTube video link..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
            {errorMessage ? (
              <p className="link-error">{errorMessage}</p>
            ) : statusText ? (
              <p style={{ color: "var(--ink)", fontWeight: "bold", marginTop: "8px" }}>
                ⏳ {statusText}
              </p>
            ) : (
              <p className="direct-note">Paste YouTube link to save MP4 directly</p>
            )}
          </div>

          <button
            type="submit"
            className="primary"
            disabled={isProcessing || !urlInput.trim()}
          >
            {isProcessing ? "Processing..." : "Download Now"}
          </button>
        </form>
      </main>

      <footer>
        <p>© 2026 VidLift. All rights reserved.</p>
      </footer>
    </div>
  );
}
