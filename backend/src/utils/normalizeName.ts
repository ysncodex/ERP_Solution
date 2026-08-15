/** Trim and collapse whitespace for catalog labels. */
export function normalizeCatalogName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
