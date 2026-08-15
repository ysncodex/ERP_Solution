import { canMutateData, getStoredUser } from '@/shared/utils';

/** True when the current user may create, edit, or delete data. */
export function useCanMutate(): boolean {
  return canMutateData(getStoredUser()?.role);
}
