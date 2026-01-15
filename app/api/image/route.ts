import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { getDailyDish } from "../../utils/dailyDish";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get("date");
  const stage = parseInt(searchParams.get("stage") || "0");

  // Validate date param
  if (!date) {
    return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
  }

  try {
    const dish = getDailyDish(date);

    if (!dish || !dish.image_url) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    let buffer: Buffer;

    if (dish.image_url.startsWith("images")) {
      // Local file in public directory
      const filePath = path.join(process.cwd(), "public", dish.image_url);
      try {
        buffer = await fs.readFile(filePath);
      } catch (err) {
        console.error("File read error:", err);
        return NextResponse.json({ error: "Image file not found" }, { status: 404 });
      }
    } else {
      // External URL
      const response = await fetch(dish.image_url);
      if (!response.ok) {
        throw new Error("Failed to fetch image");
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // Pixelation factor logic:
    // Stage 0 -> High pixelation (e.g., 40)
    // Stage 6 -> Low pixelation (1)
    // Matches the client-side logic: Math.max(1, 40 - attempt * 7)
    // We can tweak this.
    // Sharp pixelate uses a size between 1 and 1000.
    // 1 mean no pixelation? No, sharp pixelate(size) means "pixel size".
    // Wait, sharp.pixelate(size): "Use a size of roughly size x size pixels."
    // So larger size = more pixelated.

    let pixelSize = Math.max(1, 40 - stage * 7);
    if (stage >= 6) pixelSize = 1; // Clear image (effectively, though 1 might still strictly be pixelation filter, usually nice to just skip if we want perfect clarity, but requirement says pixelated figure)
    // Actually, at stage 6/win we probably want the original High Res?
    // User requirement: "pixelated figure is also made on the client side, when it should be on the server side."
    // And "miniature version... on top left".
    // We'll trust the logic.

    // If pixelSize is 1, maybe just don't pixelate?
    // Let's stick to the pixelate function for consistency, or skip if 1?
    // sharp pixelate(1) might do nothing noticeable or might resample. Let's try it.

    let imageProcessor = sharp(buffer);

    // Resize to a standard size first (cover)
    imageProcessor = imageProcessor.resize(400, 300, { fit: "cover" });

    // Get the standard sized buffer first
    const standardBuffer = await imageProcessor.toBuffer();

    if (pixelSize > 1) {
      // Simulate pixelation by resizing down and then up with nearest neighbor
      // The effective width we want is roughly original_width / pixelSize
      const smallWidth = Math.floor(400 / pixelSize);
      const smallHeight = Math.floor(300 / pixelSize);

      // Downscale
      const smallBuffer = await sharp(standardBuffer)
        .resize(smallWidth, smallHeight, { kernel: sharp.kernel.nearest })
        .toBuffer();

      // Upscale back
      const pixelatedBuffer = await sharp(smallBuffer).resize(400, 300, { kernel: sharp.kernel.nearest }).toBuffer();

      return new Response(pixelatedBuffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // If no pixelation (stage 10 or win), return the standard clear image
    return new Response(standardBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("Image processing error:", error);
    return NextResponse.json({ error: "Image processing failed" }, { status: 500 });
  }
}
