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

    const info = await ytdl.getInfo(url);
    const cleanTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, "").trim();

    // Select format with both audio and video
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
      title: cleanTitle || "video",
      downloadUrl: format.url,
    });
  } catch (err: any) {
    console.error("YTDL Error:", err);
    return NextResponse.json(
      { error: "Failed to process YouTube video." },
      { status: 500 }
    );
  }
}
