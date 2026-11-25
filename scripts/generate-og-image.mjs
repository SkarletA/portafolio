// Generates public/og-image.png (1200x630, matching src/data/seo.ts'
// imageWidth/imageHeight) from the public/og-image.svg source. Re-run with
// `node scripts/generate-og-image.mjs` whenever the SVG changes.
import sharp from 'sharp'

const SOURCE = 'public/og-image.svg'
const WIDTH = 1200
const HEIGHT = 630

async function run() {
  await sharp(SOURCE).resize({ width: WIDTH, height: HEIGHT }).png().toFile('public/og-image.png')
}

run()
  .then(() => console.log('OG image generated.'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
