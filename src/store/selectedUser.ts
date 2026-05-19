import { create } from 'zustand';

import { todayAsIsoDate } from '@/domain/dates';

/**
 * Which user is being looked at, and the date that anchors their scoring window.
 *
 * Stored separately from filter state so a category or sort change does not
 * accidentally invalidate the reliability or transactions queries (those queries
 * are keyed on userId + from + to).
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
