<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>VidLift - All In One Video Downloader</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --accent: #2563eb;
      --accent-hover: #3b82f6;
      --text: #f8fafc;
      --subtext: #94a3b8;
      --border: #334155;
      --success: #22c55e;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px;
    }

    header {
      width: 100%;
      max-width: 800px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }

    .brand {
      font-size: clamp(18px, 4vw, 22px);
      font-weight: 800;
      color: var(--text);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-icon {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
    }

    .btn-chai {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 99px;
      font-weight: 700;
      font-size: clamp(12px, 3vw, 14px);
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
      white-space: nowrap;
    }

    main {
      width: 100%;
      max-width: 800px;
      margin: 24px 0;
    }

    .hero {
      text-align: center;
      margin-bottom: 24px;
      padding: 0 8px;
    }

    .hero h1 {
      font-size: clamp(24px, 6vw, 36px);
      font-weight: 900;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #38bdf8, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero p {
      color: var(--subtext);
      font-size: clamp(14px, 3.5vw, 16px);
    }

    .converter-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: clamp(16px, 4vw, 28px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }

    .input-group {
      margin-bottom: 16px;
    }

    .input-group input {
      width: 100%;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: #0f172a;
      color: var(--text);
      font-size: 16px; /* Prevents auto-zoom on mobile safari */
      outline: none;
    }

    .btn-submit {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, var(--accent), var(--accent-hover));
      color: #fff;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      cursor: pointer;
      touch-action: manipulation;
    }

    .btn-submit:disabled {
      background: #475569;
      cursor: not-allowed;
    }

    .error-msg {
      color: #f87171;
      font-size: 14px;
      margin-top: 8px;
    }

    /* Responsive Result Preview Section */
    .result-box {
      margin-top: 20px;
      padding: 16px;
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 12px;
      display: none;
    }

    .video-info {
      display: flex;
      flex-direction: row;
      gap: 12px;
      margin-bottom: 16px;
      align-items: center;
    }

    .video-thumb {
      width: 80px;
      height: 80px;
      border-radius: 10px;
      object-fit: cover;
      flex-shrink: 0;
    }

    .video-details {
      overflow: hidden;
    }

    .video-details h3 {
      font-size: clamp(14px, 3.5vw, 16px);
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .video-details p {
      color: var(--subtext);
      font-size: 13px;
    }

    .download-links {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .download-btn {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: var(--success);
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
    }

    .download-btn.audio {
      background: #8b5cf6;
    }

    /* Mobile Responsive Modal */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }

    .modal-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 20px;
      border-radius: 16px;
      width: 100%;
      max-width: 420px;
      position: relative;
    }

    .close-btn {
      position: absolute;
      top: 14px; right: 14px;
      background: none; border: none;
      color: var(--subtext);
      font-size: 20px; cursor: pointer;
    }

    .tab-group {
      display: flex;
      gap: 8px;
      margin: 16px 0;
    }

    .tab-btn {
      flex: 1;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #0f172a;
      color: var(--text);
      font-weight: 700;
      cursor: pointer;
    }

    .tab-btn.active {
      border-color: var(--accent);
      background: rgba(37, 99, 235, 0.2);
    }

    .pay-details {
      background: #0f172a;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-bottom: 16px;
    }

    .pay-details div {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .form-group input {
      padding: 10px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #0f172a;
      color: var(--text);
      font-size: 16px;
    }

    footer {
      margin-top: auto;
      text-align: center;
      color: var(--subtext);
      font-size: 13px;
      padding: 16px 0;
    }

    /* Media Query Adjustments */
    @media (max-width: 480px) {
      body {
        padding: 8px;
      }
      .video-info {
        flex-direction: column;
        text-align: center;
      }
      .video-thumb {
        width: 100%;
        height: 160px;
      }
      .download-btn {
        flex-direction: column;
        gap: 4px;
        text-align: center;
      }
    }
  </style>
</head>
<body>

  <header>
    <a href="#" class="brand">
      <div class="brand-icon">V</div>
      VidLift
    </a>
    <button class="btn-chai" onclick="toggleModal(true)">☕ Buy Me a Chai</button>
  </header>

  <main>
    <section class="hero">
      <h1>All In One Downloader</h1>
      <p>TikTok, YouTube, Instagram, and Facebook videos save karne ke liye link paste karein.</p>
    </section>

    <div class="converter-card">
      <form id="downloadForm">
        <div class="input-group">
          <input type="url" id="videoUrl" placeholder="https://..." required />
          <div class="error-msg" id="errorMsg"></div>
        </div>
        <button type="submit" id="submitBtn" class="btn-submit">Get Video</button>
      </form>

      <div class="result-box" id="resultBox">
        <div class="video-info">
          <img id="videoThumb" src="" alt="Thumbnail" class="video-thumb" />
          <div class="video-details">
            <h3 id="videoTitle">Video Title</h3>
            <p id="videoAuthor">Author</p>
          </div>
        </div>
        <div class="download-links" id="downloadLinks"></div>
      </div>
    </div>
  </main>

  <!-- Chai Modal -->
  <div class="modal-overlay" id="chaiModal">
    <div class="modal-card">
      <button class="close-btn" onclick="toggleModal(false)">✕</button>
      <h2>☕ Buy Me a Chai</h2>
      <p style="color: var(--subtext); font-size: 13px; margin-top: 4px;">Server costs and maintenance support.</p>

      <div class="tab-group">
        <button class="tab-btn active" id="btnJazz" onclick="switchTab('jazzcash')">JazzCash</button>
        <button class="tab-btn" id="btnBinance" onclick="switchTab('binance')">Binance Pay</button>
      </div>

      <div class="pay-details" id="jazzDetails">
        <small style="color: var(--subtext);">JazzCash Till ID:</small>
        <div>
          <strong>984279231</strong>
          <button style="padding: 4px 8px; cursor: pointer;" onclick="copyText('984279231')">Copy</button>
        </div>
      </div>

      <div class="pay-details" id="binanceDetails" style="display: none;">
        <small style="color: var(--subtext);">Binance Pay ID:</small>
        <div>
          <strong>1179481269</strong>
          <button style="padding: 4px 8px; cursor: pointer;" onclick="copyText('1179481269')">Copy</button>
        </div>
      </div>

      <form action="https://formspree.io/f/mureedhussain0110@gmail.com" method="POST" class="form-group">
        <input type="hidden" name="Payment Method" id="payMethodInput" value="JazzCash" />
        <input type="text" name="Payer ID" placeholder="Sender Account Number / Binance ID" required />
        <input type="text" name="TRX ID" placeholder="Transaction ID (TRX)" required />
        <input type="text" name="Proof Link" placeholder="Screenshot URL (Optional)" />
        <button type="submit" class="btn-submit" style="background: var(--success);">Submit Proof</button>
      </form>
    </div>
  </div>

  <footer>
    © 2026 VidLift. All rights reserved.
  </footer>

  <script>
    const ADSTERRA_DIRECT_LINK = "https://regaincocoa.com/qjav5s6mva?key=3bbb838906256a99f0797d7ab1b1c7f8";
    const API_KEY = "29f8c3b79amshc7b9755d426320dp1b94fajsn62b1821d47db";
    const API_HOST = "social-download-all-in-one.p.rapidapi.com";

    const form = document.getElementById('downloadForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMsg');
    const resultBox = document.getElementById('resultBox');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = document.getElementById('videoUrl').value.trim();
      
      errorMsg.textContent = "";
      submitBtn.disabled = true;
      submitBtn.textContent = "Extracting Links...";
      resultBox.style.display = "none";

      try {
        const response = await fetch("https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-rapidapi-host": API_HOST,
            "x-rapidapi-key": API_KEY
          },
          body: JSON.stringify({ url: url })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.message || "Failed to fetch video details.");
        }

        document.getElementById('videoThumb').src = data.thumbnail || 'https://via.placeholder.com/100';
        document.getElementById('videoTitle').textContent = data.title || 'Social Video';
        document.getElementById('videoAuthor').textContent = `@${data.author || data.unique_id || 'user'}`;

        const linksContainer = document.getElementById('downloadLinks');
        linksContainer.innerHTML = "";

        if (data.medias && data.medias.length > 0) {
          data.medias.forEach((media) => {
            const a = document.createElement('a');
            a.href = media.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.className = media.type === 'audio' ? 'download-btn audio' : 'download-btn';
            
            const qualityText = media.quality ? media.quality.replace('_', ' ').toUpperCase() : 'DOWNLOAD';
            const ext = media.extension ? media.extension.toUpperCase() : 'MP4';
            
            a.innerHTML = `<span>⬇️ Download ${qualityText} (${ext})</span><span>${media.data_size ? (media.data_size / (1024*1024)).toFixed(1) + ' MB' : ''}</span>`;
            linksContainer.appendChild(a);
          });
        }

        resultBox.style.display = "block";
        window.open(ADSTERRA_DIRECT_LINK, "_blank");

      } catch (err) {
        errorMsg.textContent = err.message || "An error occurred. Verify URL or API quota.";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Get Video";
      }
    });

    function toggleModal(show) {
      document.getElementById('chaiModal').style.display = show ? 'flex' : 'none';
    }

    function switchTab(type) {
      const isJazz = type === 'jazzcash';
      document.getElementById('btnJazz').classList.toggle('active', isJazz);
      document.getElementById('btnBinance').classList.toggle('active', !isJazz);
      document.getElementById('jazzDetails').style.display = isJazz ? 'block' : 'none';
      document.getElementById('binanceDetails').style.display = isJazz ? 'none' : 'block';
      document.getElementById('payMethodInput').value = isJazz ? 'JazzCash' : 'Binance Pay';
    }

    function copyText(text) {
      navigator.clipboard.writeText(text);
      alert('Copied: ' + text);
    }
  </script>
</body>
</html>
