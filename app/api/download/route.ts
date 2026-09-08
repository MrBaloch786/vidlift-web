import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: "Please enter a valid video link." },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://cobalt-social-media-downloader.p.rapidapi.com/cobalt-download/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "cobalt-social-media-downloader.p.rapidapi.com",
          "x-rapidapi-key":
            "b4b6d55fe8msh1e21dc4284c1321p1b51adjsn2f64b3242624",
        },
        body: JSON.stringify({
          url: url,
          videoQuality: "1080",
          filenameStyle: "basic",
          downloadMode: "auto",
        }),
      }
    );

    const data = await response.json();

    // Check for returned direct download URL or redirect stream link
    const downloadUrl = data.url || data.picker?.[0]?.url;

    if (!response.ok || !downloadUrl) {
      return NextResponse.json(
        { error: data.text || "Failed to retrieve direct download link." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      downloadUrl: downloadUrl,
      title: "video",
    });
  } catch (err: any) {
    console.error("RapidAPI Error:", err);
    return NextResponse.json(
      { error: "Server encountered an error processing request." },
      { status: 500 }
    );
  }
}
