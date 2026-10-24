export function inkFor(color: string) {
  const hex = color.trim().replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return '#ffffff'
  const red = Number.parseInt(full.slice(0, 2), 16)
  const green = Number.parseInt(full.slice(2, 4), 16)
  const blue = Number.parseInt(full.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000
  return luminance > 160 ? '#1e1b4b' : '#ffffff'
}

export function normalizeHex(value: string) {
  const raw = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase()
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`
  return null
}
