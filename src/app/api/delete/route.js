import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2 as r2Client } from "@/lib/r2";
import { NextResponse } from "next/server";

export async function DELETE(request) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);

    return NextResponse.json({ success: true, message: "File deleted!" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }
}
