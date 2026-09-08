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
    const title = info.videoDetails.title;
    const thumbnail = info.videoDetails.thumbnails.slice(-1)[0]?.url;

    // Filter formats with both audio and video
    const formats = ytdl.filterFormats(info.formats, "videoandaudio");

    if (!formats || formats.length === 0) {
      return NextResponse.json(
        { error: "No direct formats found for this video." },
        { status: 404 }
      );
    }

    const videoOptions = formats.map((f) => ({
      qualityLabel: f.qualityLabel || "MP4",
      url: f.url,
      container: f.container || "mp4",
    }));

    return NextResponse.json({
      title,
      thumbnail,
      videoOptions,
    });
  } catch (err: any) {
    console.error("YTDL Error:", err);
    return NextResponse.json(
      { error: "Failed to process YouTube video." },
      { status: 500 }
    );
  }
}
