import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !ytdl.validateURL(url)) {
      return NextResponse.json(
        { error: "Please enter a valid YouTube URL." },
        { status: 400 }
      );
    }

    // Retrieve video details and formats
    const info = await ytdl.getInfo(url);

    // Get highest quality format with both audio and video
    const format = ytdl.chooseFormat(info.formats, {
      quality: "highest",
      filter: "videoandaudio",
    });

    if (!format || !format.url) {
      return NextResponse.json(
        { error: "No direct download link found for this video." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      title: info.videoDetails.title,
      downloadUrl: format.url,
      thumbnail: info.videoDetails.thumbnails.slice(-1)[0]?.url,
    });
  } catch (err: any) {
    console.error("YTDL Error:", err);
    return NextResponse.json(
      { error: "Failed to process YouTube video." },
      { status: 500 }
    );
  }
}