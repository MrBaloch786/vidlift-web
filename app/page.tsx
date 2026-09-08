"use client";

import React, { useState } from "react";

export default function HomePage() {
  const [urlInput, setUrlInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!urlInput.trim()) {
      setErrorMessage("Please enter a video URL.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch video.");

      // Open stream in browser download mode
      const a = document.createElement("a");
      a.href = data.downloadUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = `${data.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
      </header>

      <section className="hero">
        <h1>
          Download Videos <em>effortlessly.</em>
        </h1>
        <p>Paste a video link below to save directly to your device.</p>
      </section>

      <main className="converter" style={{ margin: "0 auto", padding: "40px 20px" }}>
        <form onSubmit={handleSubmit}>
          <div className="link-box">
            <label htmlFor="video-url">Paste Video URL</label>
            <input
              id="video-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            {errorMessage && <p className="link-error">{errorMessage}</p>}
          </div>

          <button type="submit" className="primary" disabled={isProcessing}>
            {isProcessing ? "Processing Video..." : "Download Video"}
          </button>
        </form>
      </main>

      <footer>
        <p>© 2026 VidLift. All rights reserved.</p>
      </footer>
    </div>
  );
}
