import { describe, expect, it } from 'vitest';

const BASE = 'http://test.local';
const userPath = (id: string): string => `${BASE}/api/users/${id}`;

describe('reliability handler', () => {
  it('returns the fixture response when from is provided', async () => {
    const response = await fetch(`${userPath('user_1001')}/reliability?from=2026-02-20`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reliability_index).toBe(64);
    expect(data.score_band).toBe('MEDIUM');
  });

  it('returns 400 with an error message when from is missing', async () => {
    const response = await fetch(`${userPath('user_1001')}/reliability`);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  it('returns 400 when from is present but empty', async () => {
    const response = await fetch(`${userPath('user_1001')}/reliability?from=`);
    expect(response.status).toBe(400);
  });
});

describe('transactions handler', () => {
  it('returns all 2000 transactions when no pagination params are passed', async () => {
    const response = await fetch(
      `${userPath('user_1001')}/transactions?from=2025-09-01&to=2026-02-20`,
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.transactions).toHaveLength(2000);
    expect(data.has_more).toBe(false);
  });

  it('returns up to 200 records and a non-null next_cursor in cursor mode by default', async () => {
    const response = await fetch(
      `${userPath('user_1001')}/transactions?from=2025-09-01&to=2026-02-20&cursor=`,
    );
    const data = await response.json();
    expect(data.transactions).toHaveLength(200);
    expect(data.next_cursor).not.toBeNull();
  });

  it('respects the limit query param in cursor mode (up to the 500 maximum)', async () => {
    const response = await fetch(
      `${userPath('user_1001')}/transactions?from=2025-09-01&to=2026-02-20&cursor=&limit=500`,
    );
    const data = await response.json();
    expect(data.transactions).toHaveLength(500);
    expect(data.next_cursor).not.toBeNull();
  });

  it('walks cursor pages without duplicates and ends with null next_cursor', async () => {
    const seenIds = new Set<string>();
    let cursor: string | null = '';
    let pages = 0;
    while (cursor !== null) {
      const url = `${userPath('user_1001')}/transactions?from=2025-09-01&to=2026-02-20&cursor=${cursor}`;
      const response = await fetch(url);
      const data: { transactions: { id: string }[]; next_cursor: string | null } =
        await response.json();
      for (const tx of data.transactions) {
        expect(seenIds.has(tx.id)).toBe(false);
        seenIds.add(tx.id);
      }
      cursor = data.next_cursor;
      pages++;
    }
    expect(seenIds.size).toBe(2000);
    expect(pages).toBe(10); // default page size of 200 → 10 pages for 2000 records
  });

  it('returns the requested slice in offset/limit mode', async () => {
    const response = await fetch(
      `${userPath('user_1001')}/transactions?from=2025-09-01&to=2026-02-20&page=2&limit=100`,
    );
    const data = await response.json();
    expect(data.transactions).toHaveLength(100);
    expect(data.page).toBe(2);
    expect(data.limit).toBe(100);
    expect(data.total_pages).toBe(20);
    expect(data.has_more).toBe(true);
  });
});

describe('transaction-events SSE handler', () => {
  it('responds with text/event-stream content type', async () => {
    const response = await fetch(`${userPath('user_1001')}/transaction-events`);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
  });

  it('emits a sequence containing ADDED, UPDATED, and DELETED events', async () => {
    const response = await fetch(`${userPath('user_1001')}/transaction-events`);
    const text = await response.text();
    expect(text).toMatch(/event: TRANSACTION_ADDED/);
    expect(text).toMatch(/event: TRANSACTION_UPDATED/);
    expect(text).toMatch(/event: TRANSACTION_DELETED/);
    const frames = text.split('\n\n').filter(Boolean);
    expect(frames.length).toBeGreaterThanOrEqual(5);
  });
});
