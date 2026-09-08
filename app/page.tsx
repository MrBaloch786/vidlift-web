"use client";

import React, { useState } from "react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"upload" | "link">("link");
  const [file, setFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Client-side URL Validator
  const validateUrl = (value: string) => {
    if (!value.trim()) return "Paste a video URL.";
    try {
      const parsedUrl = new URL(value);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return "Use an HTTP or HTTPS link.";
      }
      return "";
    } catch {
      return "Enter a complete, valid URL.";
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrlInput(value);
    if (value.length > 0) {
      setErrorMessage(validateUrl(value));
    } else {
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "link") {
      const err = validateUrl(urlInput);
      if (err) {
        setErrorMessage(err);
        return;
      }

      setIsProcessing(true);

      try {
        // 1. Fetch video details from our Next.js API
        const res = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Download failed");

        // 2. Fetch the video payload directly as a Blob
        const videoResponse = await fetch(data.downloadUrl);
        const blob = await videoResponse.blob();

        // 3. Force direct file save in browser
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${data.title || "video"}.mp4`;
        document.body.appendChild(link);
        link.click();

        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (error: any) {
        setErrorMessage(error.message || "An error occurred while downloading.");
      } finally {
        setIsProcessing(false);
      }
    } else {
      if (!file) {
        setErrorMessage("Please select a file to upload.");
        return;
      }
      alert("File processing is ready.");
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
          <span>🔒 Safe & Direct Downloader</span>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <span /> FAST & FREE
        </div>
        <h1>
          Download Videos <em>effortlessly.</em>
        </h1>
        <p>Paste a video link below to download directly to your device.</p>
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
                  placeholder="Paste YouTube or direct video link here..."
                  value={urlInput}
                  onChange={handleUrlChange}
                />
              </div>
              {errorMessage ? (
                <p className="link-error">{errorMessage}</p>
              ) : (
                <p className="direct-note">
                  Supports YouTube and direct video links (.mp4, .mov, .webm)
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
              (activeTab === "link" && (!urlInput || !!errorMessage)) ||
              (activeTab === "upload" && !file)
            }
          >
            {isProcessing ? "Processing Download..." : "Download Now"}
          </button>
        </form>
      </main>

      <footer>
        <p>© 2026 VidLift. All rights reserved.</p>
      </footer>
    </div>
  );
}
