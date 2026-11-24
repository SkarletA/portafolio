// Generates the optimized portrait variants PortraitTile consumes (480/960
// width, WebP only) from the raw public/portrait.jpeg. Re-run with
// `node scripts/generate-portrait.mjs` whenever the source photo changes.
import sharp from 'sharp'

const SOURCE = 'public/portrait.jpeg'
const WIDTHS = [480, 960]

async function run() {
  for (const width of WIDTHS) {
    // .rotate() with no args auto-orients from EXIF before resizing; not
    // calling withMetadata() afterwards strips EXIF/GPS from the output.
    await sharp(SOURCE)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(`public/portrait-${width}.webp`)
  }
}

run()
  .then(() => console.log('Portrait variants generated.'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
