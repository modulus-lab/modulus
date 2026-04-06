import express from 'express';
import { getStorage } from '@/server/storage.js';

const router = express.Router();

const DEFAULT_BALANCE = 200;
const BALANCE_COLLECTION = 'retailerBalances';
const SERVICE_NAME = '4_retailer-wallet';

function getRetailerId(req: express.Request): string {
  const fromBody = typeof req.body?.retailerId === 'string' ? req.body.retailerId : null;
  const fromHeader = typeof req.header('x-retailer-id') === 'string' ? req.header('x-retailer-id') : null;
  const fromQuery = typeof req.query?.retailerId === 'string' ? req.query.retailerId : null;
  return (fromBody || fromHeader || fromQuery || 'default').trim();
}

function getUserId(req: express.Request): string | null {
  const fromBody = typeof req.body?.userId === 'string' ? req.body.userId : null;
  const fromHeader = typeof req.header('x-user-id') === 'string' ? req.header('x-user-id') : null;
  const fromQuery = typeof req.query?.userId === 'string' ? req.query.userId : null;
  const value = (fromBody || fromHeader || fromQuery || '').trim();
  return value.length > 0 ? value : null;
}

function getSelectedResponse(req: express.Request): string | null {
  const userId = getUserId(req);
  if (!userId) return null;
  const matches = getStorage().findByUniqueKey('responses', 'userId', userId);
  if (matches.length === 0) return null;
  const mapping = matches[0];
  const selected = mapping?.responses?.[SERVICE_NAME];
  return typeof selected === 'string' ? selected : null;
}

function getSelectedConfig(req: express.Request): Record<string, any> | null {
  const userId = getUserId(req);
  if (!userId) return null;
  const matches = getStorage().findByUniqueKey('responses', 'userId', userId);
  if (matches.length === 0) return null;
  const mapping = matches[0];
  const selectedResponse = getSelectedResponse(req);
  if (!selectedResponse) return null;
  const config = mapping?.configs?.[SERVICE_NAME]?.[selectedResponse];
  return config && typeof config === 'object' ? config : null;
}

function getInitialBalanceFromConfig(req: express.Request): number | null {
  const config = getSelectedConfig(req);
  if (!config) return null;
  const raw = config.initialBalance;
  const value = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN;
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function getBalanceKey(retailerId: string, userId?: string | null): string {
  return `${retailerId}:${userId ?? 'default'}`;
}

function getLatestBalanceRecord(balanceKey: string): { balance: number } | null {
  const matches = getStorage().findByUniqueKey(BALANCE_COLLECTION, 'retailerKey', balanceKey);
  if (matches.length === 0) return null;
  const sorted = matches.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return sorted[0] ?? null;
}

function persistBalance(details: {
  retailerId: string;
  balance: number;
  status: 'init' | 'success' | 'insufficient_balance' | 'bad_request';
  requestedAmount?: number | null;
  userId?: string | null;
}): void {
  const balanceKey = getBalanceKey(details.retailerId, details.userId);
  getStorage().insert(BALANCE_COLLECTION, {
    retailerId: details.retailerId,
    balance: details.balance,
    status: details.status,
    requestedAmount: details.requestedAmount ?? null,
    userId: details.userId ?? null,
    uniqueKeys: {
      retailerKey: balanceKey
    }
  });
}

function getBalance(
  retailerId: string,
  userId?: string | null,
  initialBalanceOverride?: number | null
): number {
  const balanceKey = getBalanceKey(retailerId, userId);
  const existing = getLatestBalanceRecord(balanceKey);
  if (!existing) {
    const startingBalance = initialBalanceOverride ?? DEFAULT_BALANCE;
    persistBalance({
      retailerId,
      balance: startingBalance,
      status: 'init',
      userId
    });
    return startingBalance;
  }
  return existing.balance;
}

function parseAmount(req: express.Request): number | null {
  const raw =
    req.body?.amount ??
    req.body?.promoAmount ??
    req.body?.loadAmount ??
    req.body?.promoLoad ??
    req.body?.value;

  const amount = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

router.get('/v1/api/test/retailer/balance', (req, res) => {
  const retailerId = getRetailerId(req);
  const initialBalanceOverride = getInitialBalanceFromConfig(req);
  const userId = getUserId(req);
  const balance = getBalance(retailerId, userId, initialBalanceOverride);

  res.status(200).json({
    resultCode: 0,
    retailerId,
    balance
  });
});

router.post('/v1/api/test/retailer/load-promo', (req, res) => {
  const retailerId = getRetailerId(req);
  const amount = parseAmount(req);
  const userId = getUserId(req);
  const selectedResponse = getSelectedResponse(req);
  const initialBalanceOverride = getInitialBalanceFromConfig(req);

  if (amount === null) {
    const currentBalance = getBalance(retailerId, userId, initialBalanceOverride);
    persistBalance({
      retailerId,
      balance: currentBalance,
      status: 'bad_request',
      requestedAmount: amount,
      userId
    });
    return res.status(400).json({
      resultCode: 4001,
      error: 'bad_request',
      message: 'Invalid promo load amount. Provide a positive number in amount or promoAmount.'
    });
  }

  const currentBalance = getBalance(retailerId, userId, initialBalanceOverride);

  if (selectedResponse === 'bad_request') {
    persistBalance({
      retailerId,
      balance: currentBalance,
      status: 'bad_request',
      requestedAmount: amount,
      userId
    });
    return res.status(400).json({
      resultCode: 4001,
      error: 'bad_request',
      message: 'Bad request (forced by user mapping).'
    });
  }

  if (selectedResponse === 'insufficient_balance') {
    persistBalance({
      retailerId,
      balance: currentBalance,
      status: 'insufficient_balance',
      requestedAmount: amount,
      userId
    });
    return res.status(402).json({
      resultCode: 4002,
      error: 'insufficient_balance',
      message: 'Retailer wallet has insufficient balance for this promo load.',
      retailerId,
      requestedAmount: amount,
      remainingBalance: currentBalance
    });
  }

  if (amount > currentBalance) {
    persistBalance({
      retailerId,
      balance: currentBalance,
      status: 'insufficient_balance',
      requestedAmount: amount,
      userId
    });
    return res.status(402).json({
      resultCode: 4002,
      error: 'insufficient_balance',
      message: 'Retailer wallet has insufficient balance for this promo load.',
      retailerId,
      requestedAmount: amount,
      remainingBalance: currentBalance
    });
  }

  const remainingBalance = currentBalance - amount;
  persistBalance({
    retailerId,
    balance: remainingBalance,
    status: 'success',
    requestedAmount: amount,
    userId
  });

  return res.status(200).json({
    resultCode: 0,
    message: 'Promo load successful.',
    retailerId,
    loadedAmount: amount,
    remainingBalance
  });
});

export default router;
