import { NextRequest, NextResponse } from "next/server";

const CDN_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@zama-fhe/relayer-sdk@0.3.0-5";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = path.join("/");
  const cdnUrl = `${CDN_BASE_URL}/${filePath}`;

  try {
    const response = await fetch(cdnUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    const body = await response.arrayBuffer();

    // Determine correct content type based on file extension
    let contentType = "application/octet-stream";
    if (filePath.endsWith(".js") || filePath.endsWith(".cjs")) {
      contentType = "application/javascript; charset=utf-8";
    } else if (filePath.endsWith(".wasm")) {
      contentType = "application/wasm";
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error proxying relayer SDK:", error);
    return NextResponse.json(
      { error: "Failed to fetch from CDN" },
      { status: 500 }
    );
  }
}
