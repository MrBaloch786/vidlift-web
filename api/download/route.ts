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

    // Get metadata and clean video title for filename
    const info = await ytdl.getInfo(url);
    const rawTitle = info.videoDetails.title || "video";
    const safeTitle = rawTitle.replace(/[^a-zA-Z0-9 _-]/g, "").trim();

    // Select format with both audio and video
    const format = ytdl.chooseFormat(info.formats, {
      quality: "highest",
      filter: "videoandaudio",
    });

    if (!format || !format.url) {
      return NextResponse.json(
        { error: "No direct format found for this video." },
        { status: 404 }
      );
    }

    // Fetch stream from YouTube servers on the backend side
    const videoResponse = await fetch(format.url);

    if (!videoResponse.ok || !videoResponse.body) {
      return NextResponse.json(
        { error: "Unable to retrieve video stream." },
        { status: 500 }
      );
    }

    // Proxy the stream back to client with forced attachment headers
    return new NextResponse(videoResponse.body as any, {
      headers: {
        "Content-Disposition": `attachment; filename="${safeTitle}.mp4"`,
        "Content-Type": "video/mp4",
      },
    });
  } catch (err: any) {
    console.error("YTDL Error:", err);
    return NextResponse.json(
      { error: "Failed to download YouTube video." },
      { status: 500 }
    );
  }
}
