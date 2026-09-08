import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body?.url;

    if (!url) {
      return NextResponse.json(
        { error: "Please enter a valid YouTube video URL." },
        { status: 400 }
      );
    }

    // Request direct video link from RapidAPI Cobalt instance
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
          videoQuality: "720",
          downloadMode: "auto",
        }),
      }
    );

    const data = await response.json();

    // Check all possible response properties returned by Cobalt
    const downloadUrl =
      data?.url ||
      data?.picker?.[0]?.url ||
      data?.streamUrl;

    if (!response.ok || !downloadUrl) {
      console.error("RapidAPI API Error Response:", data);
      return NextResponse.json(
        {
          error:
            data?.text ||
            data?.message ||
            "Unable to parse video stream. Please check video privacy or RapidAPI key quota.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      downloadUrl: downloadUrl,
      title: "video",
    });
  } catch (err: any) {
    console.error("Server Route Catch Error:", err?.message || err);
    return NextResponse.json(
      { error: `Server processing error: ${err?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
