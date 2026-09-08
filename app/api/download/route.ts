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

    // Call RapidAPI Cobalt endpoint with standard video options
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

    // Check for direct stream URL or tunnel URL returned by Cobalt API
    let downloadUrl = data.url || data.picker?.[0]?.url;

    if (!response.ok || !downloadUrl) {
      console.error("RapidAPI Response Error:", data);
      return NextResponse.json(
        {
          error:
            data.text ||
            data.message ||
            "Unable to extract link. Please try another video or check your RapidAPI subscription.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      downloadUrl: downloadUrl,
      title: "video",
    });
  } catch (err: any) {
    console.error("Route Error:", err);
    return NextResponse.json(
      { error: "Server error occurred while processing video." },
      { status: 500 }
    );
  }
}
