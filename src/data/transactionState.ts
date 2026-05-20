import type { Transaction, TransactionEvent } from '@/api/schemas';

// Normalized shape: byId for O(1) lookup, allIds to preserve insertion order for rendering.
export interface TransactionState {
  byId: Record<string, Transaction>;
  allIds: string[];
}

// Folds a stream event into the current state and returns a new state.
// Every branch is immutable (the input state is never touched) and idempotent
// (re-applying the same event produces the same result), so reconnects that replay
// events cannot corrupt the cache.
export function applyTransactionEvent(
  state: TransactionState,
  event: TransactionEvent,
): TransactionState {
  if (event.type === 'TRANSACTION_DELETED') {
    return applyDeleted(state, event.transaction_id);
  }
  return applyUpsert(state, event.transaction);
}

function applyDeleted(state: TransactionState, idToRemove: string | undefined): TransactionState {
  if (idToRemove === undefined || !(idToRemove in state.byId)) {
    // Returning the same reference lets callers cheaply detect "nothing changed".
    return state;
  }
  const nextById = { ...state.byId };
  delete nextById[idToRemove];
  return {
    byId: nextById,
    allIds: state.allIds.filter((existing) => existing !== idToRemove),
  };
}

function applyUpsert(
  state: TransactionState,
  transaction: Transaction | undefined,
): TransactionState {
  // The schema marks transaction as optional on every event type, so we guard defensively.
  if (transaction === undefined) {
    return state;
  }
  const alreadyKnown = transaction.id in state.byId;
  return {
    byId: { ...state.byId, [transaction.id]: transaction },
    allIds: alreadyKnown ? state.allIds : [...state.allIds, transaction.id],
  };
}

export function toState(transactions: Transaction[]): TransactionState {
  const byId: Record<string, Transaction> = {};
  const allIds: string[] = [];
  for (const tx of transactions) {
    if (!(tx.id in byId)) {
      allIds.push(tx.id);
    }
    byId[tx.id] = tx;
  }
  return { byId, allIds };
}

export function fromState(state: TransactionState): Transaction[] {
  const result: Transaction[] = [];
  for (const id of state.allIds) {
    const tx = state.byId[id];
    if (tx !== undefined) {
      result.push(tx);
    }
  }
  return result;
}
