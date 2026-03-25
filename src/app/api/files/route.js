import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { r2 as r2Client } from "@/lib/r2";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: "uploads/",
    });

    const response = await r2Client.send(command);

    const files = (response.Contents || []).map((item) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      // Build the public URL using your public bucket URL
      url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${item.Key}`,
      name: item.Key.replace("uploads/", "").replace(/^\d+-/, ""), // strip timestamp prefix for display
    }));

    // Sort newest first
    files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    return NextResponse.json({ files });
  } catch (error) {
    console.error("List error:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 },
    );
  }
}
