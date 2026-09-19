/**
 * Brand palette shared across the runtime. These are the colors of the logo
 * (a warm orange gem) plus a few complementary accents. Using them keeps
 * generated games visually consistent with the product.
 */
export const BRAND = {
  orange: 0xea580c, // primary logo orange
  amber: 0xf59e0b, // lighter highlight
  ember: 0xc2410c, // deep shadow tone
  cream: 0xfff7ed, // near-white gem facet
  violet: 0xa855f7, // complementary accent
  sky: 0x38bdf8, // secondary accent
  ink: 0x0b0b0f, // background near-black
  slate: 0x1e293b, // panel / ground tone
}

/** Ordered list handy for cycling through brand colors (e.g. per-player). */
export const BRAND_SEQUENCE = [
  BRAND.orange,
  BRAND.amber,
  BRAND.violet,
  BRAND.sky,
  BRAND.cream,
  BRAND.ember,
]

/** CSS hex string for a numeric color, e.g. brandCss(BRAND.orange) -> "#ea580c". */
export function brandCss(hex) {
  return `#${hex.toString(16).padStart(6, "0")}`
}

/** Pick a brand color by index, wrapping around the sequence. */
export function brandAt(index) {
  return BRAND_SEQUENCE[((index % BRAND_SEQUENCE.length) + BRAND_SEQUENCE.length) % BRAND_SEQUENCE.length]
}
