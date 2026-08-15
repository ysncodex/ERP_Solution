/**
 * Remove legacy browser-local POS / ERP caches now that data lives on the backend.
 */
export function clearLegacyPosStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('bb_menu_catalog_v1');
    // Drop cached transactions — ERPContext now loads from the API.
    const raw = localStorage.getItem('erp_state_v1');
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      localStorage.setItem(
        'erp_state_v1',
        JSON.stringify({ ...parsed, transactions: [] }),
      );
    }
  } catch {
    // ignore
  }
}
