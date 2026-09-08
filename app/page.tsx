"use client";

import React, { useState } from "react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"upload" | "link">("link");
  const [file, setFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "link") {
      if (!urlInput.trim()) {
        setErrorMessage("Please enter a video URL.");
        return;
      }

      setIsProcessing(true);
      setErrorMessage("");
      setDownloadProgress("Fetching video details...");

      try {
        // 1. Get YouTube direct CDN link from Next.js API
        const res = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch video.");

        setDownloadProgress("Downloading video to device...");

        // 2. Fetch the video payload directly into browser memory (bypasses player tab)
        const videoRes = await fetch(data.downloadUrl);
        if (!videoRes.ok) throw new Error("Failed to download video stream.");

        const blob = await videoRes.blob();

        // 3. Create a local object URL and trigger direct file save
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${data.title || "video"}.mp4`;
        document.body.appendChild(link);
        link.click();

        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        setDownloadProgress("");
      } catch (error: any) {
        setErrorMessage(
          error.message || "An error occurred while saving the video."
        );
        setDownloadProgress("");
      } finally {
        setIsProcessing(false);
      }
    } else {
      if (!file) {
        setErrorMessage("Please select a file to upload.");
        return;
      }
      alert("File selected.");
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
        <p>Paste a YouTube URL below to download directly to your device.</p>
      </section>

      <main className="converter" style={{ margin: "0 auto" }}>
        <div className="source-switch">
          <button
            type="button"
            className={activeTab === "link" ? "selected" : ""}
            onClick={() => {
              setActiveTab("link");
              setErrorMessage("");
            }}
          >
            Video Link
          </button>
          <button
            type="button"
            className={activeTab === "upload" ? "selected" : ""}
            onClick={() => {
              setActiveTab("upload");
              setErrorMessage("");
            }}
          >
            Upload File
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === "link" && (
            <div className="link-box">
              <label htmlFor="video-url">Video URL</label>
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
              ) : downloadProgress ? (
                <p style={{ color: "var(--ink)", fontWeight: "bold" }}>
                  ⏳ {downloadProgress}
                </p>
              ) : (
                <p className="direct-note">
                  Supports YouTube links (.mp4)
                </p>
              )}
            </div>
          )}

          {activeTab === "upload" && (
            <div className="dropzone">
              <div className="upload-icon">📁</div>
              <strong>Drag and drop your video file here</strong>
              <small>Supports MP4, MOV, WEBM, M4V</small>
              <label className="browse">
                Browse File
                <input
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFile(e.target.files[0]);
                      setErrorMessage("");
                    }
                  }}
                />
              </label>
              {file && (
                <small style={{ marginTop: "12px", fontWeight: "bold" }}>
                  Selected: {file.name}
                </small>
              )}
            </div>
          )}

          <button
            type="submit"
            className="primary"
            disabled={
              isProcessing ||
              (activeTab === "link" && !urlInput) ||
              (activeTab === "upload" && !file)
            }
          >
            {isProcessing ? "Downloading file..." : "Download Now"}
          </button>
        </form>
      </main>

      <footer>
        <p>© 2026 VidLift. All rights reserved.</p>
      </footer>
    </div>
  );
}
