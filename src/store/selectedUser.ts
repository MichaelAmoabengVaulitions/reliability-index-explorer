import { create } from 'zustand';

import { todayAsIsoDate } from '@/domain/dates';

/**
 * Which user is being looked at, and the date the scoring window ends on.
 *
 * Kept apart from the filter choices so that changing a category or the sort
 * order does not accidentally cause the reliability or transactions data to
 * be fetched again (those are stored under a key made of userId, from and to).
 */
export interface SelectedUserState {
  userId: string;
  from: string;
  setUserId: (userId: string) => void;
  setFrom: (from: string) => void;
}

export const useSelectedUser = create<SelectedUserState>((set) => ({
  userId: '',
  from: todayAsIsoDate(),
  setUserId: (userId) => set({ userId }),
  setFrom: (from) => set({ from }),
}));
