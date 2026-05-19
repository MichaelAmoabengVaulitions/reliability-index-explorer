import { describe, expect, it } from 'vitest';

import { useSelectedUser } from './selectedUser';

describe('useSelectedUser', () => {
  it('starts with no user chosen, so the UI can show its empty state until the URL or a picker supplies one', () => {
    expect(useSelectedUser.getState().userId).toBe('');
  });

  it("defaults `from` to today's UTC date in YYYY-MM-DD format", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(useSelectedUser.getState().from).toBe(today);
  });

  it('records the selected user id when setUserId is called', () => {
    useSelectedUser.getState().setUserId('user_1001');
    expect(useSelectedUser.getState().userId).toBe('user_1001');
  });

  it('records the chosen window-start date when setFrom is called', () => {
    useSelectedUser.getState().setFrom('2026-02-20');
    expect(useSelectedUser.getState().from).toBe('2026-02-20');
  });
});
