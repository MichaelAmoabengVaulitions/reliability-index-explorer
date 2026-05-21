/*
 * Local mock backend for the Reliability Index Explorer.
 *
 * Why this exists: the hosted backend's live updates endpoint does not stream.
 * It sits behind an Amazon gateway that holds the whole response back instead
 * of sending it piece by piece, so the live updates feature cannot be watched
 * working against it. This small server stands in for the backend so the
 * feature can be run and seen in a real browser.
 *
 * It answers the four things the app asks for:
 *   GET /                                  the list of users
 *   GET /api/users/:id/reliability         a reliability score
 *   GET /api/users/:id/transactions        a page of transactions
 *   GET /api/users/:id/transaction-events  the live updates stream
 *
 * The live updates stream sends events in the exact format the API
 * specification documents (docs/openapi.yaml: id, event, data lines).
 *
 * Three optional settings scale it up for stress testing how far the app
 * holds up:
 *   MOCK_TX_COUNT           transactions per user             (default 60)
 *   MOCK_EVENT_TOTAL        live events per connection        (default: continuous)
 *   MOCK_EVENT_INTERVAL_MS  milliseconds between live events  (default 3000)
 *
 * Run it:                          yarn mock
 * Then run the app pointed at it:  yarn dev:mock
 */

import { createServer } from 'node:http';

const PORT = 3001;
const CURRENCY = 'EUR';
const USER_IDS = Array.from({ length: 10 }, (_, index) => `user_${1001 + index}`);
const FIRST_EVENT_DELAY_MS = 1000;
const MS_PER_DAY = 86400000;

/*
 * Live "added" events are dated across the last few months rather than all on
 * today. That way the cashflow chart reacts across several of its bars as the
 * stream runs, instead of only the current month's bar. The span is kept just
 * under the six-month scoring window so every date still lands inside it.
 */
const LIVE_EVENT_DATE_SPAN_DAYS = 150;

/*
 * Reads a number from the environment. Written as a helper so a value of 0,
 * which is a valid choice for the event gap, is kept rather than treated as
 * missing.
 */
function numberSetting(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const TX_COUNT = numberSetting('MOCK_TX_COUNT', 60);
/*
 * With nothing set, the stream runs continuously: events keep arriving until
 * the server is stopped, which is what a demo wants. Set MOCK_EVENT_TOTAL to a
 * number to send a fixed count instead, which is useful for a bounded stress
 * run.
 */
const EVENT_TOTAL = numberSetting('MOCK_EVENT_TOTAL', Infinity);
const EVENT_INTERVAL_MS = numberSetting('MOCK_EVENT_INTERVAL_MS', 3000);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

// --- fake data --------------------------------------------------------------

const EXPENSE_MERCHANTS = [
  { code: '5411', name: 'Whole Foods Market', description: 'Grocery purchase', amount: -64.5 },
  { code: '5814', name: 'Cafe Central', description: 'Coffee purchase', amount: -8.75 },
  { code: '4900', name: 'City Electric Co', description: 'Monthly utility', amount: -110 },
  { code: '5732', name: 'Electronics Store', description: 'Electronics purchase', amount: -240 },
  { code: '5912', name: 'Pharmacy Plus', description: 'Pharmacy purchase', amount: -32.4 },
  { code: '5411', name: 'Trader Joes', description: 'Grocery purchase', amount: -41.2 },
];

const INCOME_MERCHANTS = [
  { code: '6011', name: 'Incoming Transfer', description: 'Transfer received', amount: 320 },
  { code: '5999', name: 'Online Refund', description: 'Merchant refund', amount: 47.5 },
  { code: '7299', name: 'Side Gig Payout', description: 'Freelance payment', amount: 540 },
];

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/*
 * The id for the nth transaction of a user. Padded wide so a large
 * MOCK_TX_COUNT still sorts and reads cleanly.
 */
function transactionId(userId, n) {
  return `tx_${userId}_${String(n).padStart(7, '0')}`;
}

function makeTransaction({ id, userId, amount, date, code, name, description }) {
  return {
    id,
    account_id: `acc_${userId}`,
    user_id: userId,
    amount,
    currency: CURRENCY,
    date,
    description,
    merchant_category_code: code,
    merchant_name: name,
    type: amount >= 0 ? 'credit' : 'debit',
    synced_at: `${date}T12:00:00.000Z`,
  };
}

function monthsBetween(fromIso, toIso) {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  const months = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (cursor <= to) {
    months.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

function daysBetween(fromIso, toIso) {
  const span = new Date(`${toIso}T00:00:00Z`) - new Date(`${fromIso}T00:00:00Z`);
  return Math.max(1, Math.round(span / MS_PER_DAY));
}

function addDays(fromIso, days) {
  const date = new Date(`${fromIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/*
 * Keeps a date inside the asked-for range so every transaction lands in the
 * scoring window the app is showing.
 */
function clampDate(candidate, fromIso, toIso) {
  if (candidate < fromIso) return fromIso;
  if (candidate > toIso) return toIso;
  return candidate;
}

/*
 * Built sets are kept here so a large MOCK_TX_COUNT is generated once per user
 * and window, not rebuilt on every page request.
 */
const transactionCache = new Map();

/*
 * Builds MOCK_TX_COUNT transactions for one user and window: a salary and a
 * rent payment for each month, then everyday expenses spread across the window
 * to fill the rest.
 */
function buildTransactions(userId, fromIso, toIso) {
  const cacheKey = `${userId}|${fromIso}|${toIso}|${TX_COUNT}`;
  const cached = transactionCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const transactions = [];
  const add = (fields) => {
    transactions.push(
      makeTransaction({ id: transactionId(userId, transactions.length + 1), userId, ...fields }),
    );
  };

  for (const { year, month } of monthsBetween(fromIso, toIso)) {
    if (transactions.length >= TX_COUNT) break;
    const mm = String(month + 1).padStart(2, '0');
    add({
      amount: 3000,
      date: clampDate(`${year}-${mm}-01`, fromIso, toIso),
      code: '6011',
      name: 'Employer Payroll',
      description: 'Monthly salary',
    });
    if (transactions.length >= TX_COUNT) break;
    add({
      amount: -1200,
      date: clampDate(`${year}-${mm}-02`, fromIso, toIso),
      code: '6513',
      name: 'Property Manager',
      description: 'Monthly rent',
    });
  }

  const span = daysBetween(fromIso, toIso);
  while (transactions.length < TX_COUNT) {
    const merchant = EXPENSE_MERCHANTS[transactions.length % EXPENSE_MERCHANTS.length];
    add({
      amount: merchant.amount,
      date: addDays(fromIso, (transactions.length * 7) % span),
      code: merchant.code,
      name: merchant.name,
      description: merchant.description,
    });
  }

  transactionCache.set(cacheKey, transactions);
  return transactions;
}

function discoveryResponse() {
  return {
    name: 'Reliability Index Explorer (local mock backend)',
    version: '1.0.0',
    available_users: USER_IDS,
  };
}

function reliabilityResponse(userId, fromParam) {
  return {
    user_id: userId,
    from: isIsoDate(fromParam) ? fromParam : todayIso(),
    currency: CURRENCY,
    reliability_index: 64,
    score_band: 'MEDIUM',
    metrics: {
      income_regularity: 0.83,
      income_coverage_ratio: 1.41,
      essential_payments_consistency: 0.89,
      good_months: 4,
      negative_balance_days: 54,
      late_fee_events: 1,
    },
    drivers: [
      'Income present in 5/6 months',
      'Income covers essential expenses (1.41x)',
      'Essential payments detected consistently',
      'Savings behavior detected (+13 pts)',
      'Estimated 54 negative balance day(s) (-10 pts)',
      '1 late fee event(s) detected (-1 pts)',
      'Good cashflow months: 4/6',
    ],
  };
}

/*
 * Reads the from and to dates off the request, falling back to the six months
 * ending today when they are missing or malformed.
 */
function windowFromQuery(url) {
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (isIsoDate(from) && isIsoDate(to)) return { from, to };
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  return { from: start.toISOString().slice(0, 10), to: todayIso() };
}

function transactionsResponse(userId, url) {
  const { from, to } = windowFromQuery(url);
  const all = buildTransactions(userId, from, to);
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = Number(url.searchParams.get('limit')) || all.length || 1;
  const start = (page - 1) * limit;
  return {
    transactions: all.slice(start, start + limit),
    total: all.length,
    page,
    limit,
    total_pages: Math.max(1, Math.ceil(all.length / limit)),
    has_more: start + limit < all.length,
  };
}

// --- live updates stream ----------------------------------------------------

let connectionCount = 0;

/*
 * Builds event number `index` of a connection's stream. The stream is a mix:
 * most events add a new transaction, while every fifth deletes one and every
 * third updates one, so even the short default run shows all three kinds of
 * change. The updated and deleted ids are ones the page response already
 * holds, so the effect is visible in the table. Events are built one at a
 * time, so a very large MOCK_EVENT_TOTAL never needs a large array in memory.
 */
function buildEvent(userId, connectionId, index) {
  if (index % 5 === 0) {
    return { type: 'TRANSACTION_DELETED', transaction_id: transactionId(userId, 5) };
  }
  if (index % 3 === 0) {
    return {
      type: 'TRANSACTION_UPDATED',
      transaction: makeTransaction({
        id: transactionId(userId, 1),
        userId,
        amount: 3000 + index,
        date: todayIso(),
        code: '6011',
        name: 'Employer Payroll',
        description: 'Monthly salary (corrected)',
      }),
    };
  }
  /*
   * ADD events alternate between an outflow (an expense) and an inflow (money
   * received), so the live stream shows both kinds of transaction.
   */
  const isInflowAdd = index % 2 === 0;
  const merchant = isInflowAdd
    ? INCOME_MERCHANTS[index % INCOME_MERCHANTS.length]
    : EXPENSE_MERCHANTS[index % EXPENSE_MERCHANTS.length];
  /*
   * Step the date back about a month per event and wrap, so consecutive adds
   * land in different months of the scoring window and the cashflow chart
   * reacts across its bars rather than only today's.
   */
  const dayOffset = (index * 29) % LIVE_EVENT_DATE_SPAN_DAYS;
  return {
    type: 'TRANSACTION_ADDED',
    transaction: makeTransaction({
      id: `tx_${userId}_live_${connectionId}_${index}`,
      userId,
      amount: merchant.amount,
      date: addDays(todayIso(), -dayOffset),
      code: merchant.code,
      name: merchant.name,
      description: merchant.description,
    }),
  };
}

function streamEvents(req, res, userId) {
  connectionCount += 1;
  const connectionId = connectionCount;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    ...CORS_HEADERS,
  });

  let sent = 0;
  let timer = null;

  const sendNext = () => {
    if (sent >= EVENT_TOTAL) {
      /*
       * A real live-updates backend holds the connection open and waits for
       * the next event rather than closing after a fixed number. We do the
       * same: once every scheduled event has been sent we stop sending but
       * leave the connection open, so the app's badge stays on "Live" instead
       * of dropping into a reconnect. The connection is released when the
       * browser navigates away (see the "close" handler below).
       */
      console.log(`  ${userId}: sent ${sent} events, holding the connection open`);
      return;
    }
    sent += 1;
    const event = buildEvent(userId, connectionId, sent);
    const flushed = res.write(
      `id: ${sent}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
    );
    // Keep the log readable when the event count is large.
    if (sent <= 5 || sent % 500 === 0 || sent === EVENT_TOTAL) {
      const totalLabel = Number.isFinite(EVENT_TOTAL) ? ` of ${EVENT_TOTAL}` : '';
      console.log(`  ${userId}: event ${sent}${totalLabel} (${event.type})`);
    }
    /*
     * If the app is reading slower than we are sending, wait for its buffer to
     * drain before continuing. This keeps the test honest: the mock sends as
     * fast as the app can take, never faster.
     */
    if (flushed) {
      timer = setTimeout(sendNext, EVENT_INTERVAL_MS);
    } else {
      res.once('drain', () => {
        timer = setTimeout(sendNext, EVENT_INTERVAL_MS);
      });
    }
  };

  timer = setTimeout(sendNext, FIRST_EVENT_DELAY_MS);
  req.on('close', () => {
    if (timer) clearTimeout(timer);
  });
}

// --- request routing --------------------------------------------------------

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Only GET is supported' });
    return;
  }

  console.log(`${req.method} ${pathname}`);

  if (pathname === '/') {
    sendJson(res, 200, discoveryResponse());
    return;
  }

  const reliabilityMatch = pathname.match(/^\/api\/users\/([^/]+)\/reliability$/);
  if (reliabilityMatch) {
    sendJson(res, 200, reliabilityResponse(reliabilityMatch[1], url.searchParams.get('from')));
    return;
  }

  const transactionsMatch = pathname.match(/^\/api\/users\/([^/]+)\/transactions$/);
  if (transactionsMatch) {
    sendJson(res, 200, transactionsResponse(transactionsMatch[1], url));
    return;
  }

  const eventsMatch = pathname.match(/^\/api\/users\/([^/]+)\/transaction-events$/);
  if (eventsMatch) {
    streamEvents(req, res, eventsMatch[1]);
    return;
  }

  sendJson(res, 404, { error: `No mock route for ${pathname}` });
});

server.listen(PORT, () => {
  console.log(`Mock backend running at http://localhost:${PORT}`);
  console.log(`  transactions per user:       ${TX_COUNT}`);
  const eventTotalLabel = Number.isFinite(EVENT_TOTAL) ? `${EVENT_TOTAL}` : 'continuous';
  console.log(`  live events per connection:  ${eventTotalLabel}, one every ${EVENT_INTERVAL_MS}ms`);
  console.log('Start the app against it with:  yarn dev:mock');
});
