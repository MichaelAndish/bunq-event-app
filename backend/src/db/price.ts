/** Strip all non-numeric characters except the decimal point, e.g. "€25.00" → "25.00" */
export function parsePrice(raw: string): string {
  return raw.replace(/[^0-9.]/g, '')
}
