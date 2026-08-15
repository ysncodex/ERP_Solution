import { useContext } from 'react';
import { ERPActionsContext } from './ERPActionsContextDef';

/**
 * Access only the ERP action/dispatch functions.
 *
 * Prefer this over `useERP()` in components that just fire mutations or refreshes
 * and never read ledger data — the actions context is stable, so those components
 * won't re-render when transactions/stats change.
 */
export function useERPActions() {
  const context = useContext(ERPActionsContext);
  if (!context) {
    throw new Error('useERPActions must be used within ERPProvider');
  }
  return context;
}
