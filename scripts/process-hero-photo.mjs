import sharp from "sharp";

async function process(input, output) {
  await sharp(input)
    .rotate()
    .resize(1600, 2000, { fit: "cover", position: sharp.strategy.attention })
    .jpeg({ quality: 92 })
    .toFile(output);
  const meta = await sharp(output).metadata();
  console.log(output, "->", `${meta.width}x${meta.height}`);
}

await process("/home/oliverstraus/Pictures/OTHER/me.jpeg", "public/assets/oliver-hero.jpg");
await process("/home/oliverstraus/Pictures/OTHER/me1.jpeg", "public/assets/oliver-hero-alt.jpg");
