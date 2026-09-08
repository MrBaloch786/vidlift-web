# VidLift

## Before launch

1. Replace `https://YOUR-DOMAIN.com` in `app/robots.ts` and `app/sitemap.ts`.
2. Add your real operator name and contact email to the legal pages.
3. Add a clearly labelled Adsterra placement. Do not disguise ads as download buttons.
4. Deploy the repository to Vercel with the default Next.js build settings.

## Deploy from your computer

1. Extract the ZIP.
2. Upload the extracted project to a new GitHub repository.
3. In Vercel, choose **Add New → Project**, import that repository, and click **Deploy**.
4. Keep Framework Preset as **Next.js**, Build Command as `npm run build`, and Output Directory empty.

## Important implementation status

The current browser flow validates a local video, lets the user select output settings, and downloads the original file after the sponsor step. Actual transcoding is not faked: MP3 extraction and resolution conversion still require a browser FFmpeg worker or a dedicated media-processing backend. Large 2K/4K conversions are not suitable for ordinary Vercel serverless functions.
