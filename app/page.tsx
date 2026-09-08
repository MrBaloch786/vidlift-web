"use client";

import React, { useState } from "react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"upload" | "link">("link");
  const [file, setFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "link") {
      if (!urlInput.trim()) {
        setErrorMessage("Please enter a video URL.");
        return;
      }

      setIsProcessing(true);
      setErrorMessage("");

      try {
        // 1. Post URL directly to backend endpoint
        const res = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Download failed.");
        }

        // 2. Read content filename header if available
        const disposition = res.headers.get("Content-Disposition");
        let filename = "video.mp4";
        if (disposition && disposition.includes("filename=")) {
          filename = disposition.split("filename=")[1].replace(/"/g, "");
        }

        // 3. Convert incoming stream response directly to blob
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        // 4. Force immediate file download in user browser
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();

        // Cleanup DOM
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (error: any) {
        setErrorMessage(error.message || "An error occurred during download.");
      } finally {
        setIsProcessing(false);
      }
    } else {
      if (!file) {
        setErrorMessage("Please select a file to upload.");
        return;
      }
      alert("File selected for conversion.");
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
        <p>Paste a video link below to save directly to your device downloads folder.</p>
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
                  placeholder="Paste YouTube or direct video link..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </div>
              {errorMessage ? (
                <p className="link-error">{errorMessage}</p>
              ) : (
                <p className="direct-note">
                  Paste YouTube links to save `.mp4` directly to your local drive
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
            {isProcessing ? "Downloading to device..." : "Download Now"}
          </button>
        </form>
      </main>

      <footer>
        <p>© 2026 VidLift. All rights reserved.</p>
      </footer>
    </div>
  );
}
