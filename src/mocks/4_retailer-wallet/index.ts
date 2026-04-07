import express from 'express';
import { getStorage } from '@/server/storage.js';

const router = express.Router();

const DEFAULT_BALANCE = 200;
const MAPPINGS_COLLECTION = 'responses';
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
  const matches = getStorage().findByUniqueKey(MAPPINGS_COLLECTION, 'userId', userId);
  if (matches.length === 0) return null;
  const mapping = matches[0];
  const selected = mapping?.responses?.[SERVICE_NAME];
  return typeof selected === 'string' ? selected : null;
}

function getSelectedConfig(mapping: any, selectedResponse: string | null): Record<string, any> | null {
  if (!mapping || !selectedResponse) return null;
  const config = mapping?.configs?.[SERVICE_NAME]?.[selectedResponse];
  return config && typeof config === 'object' ? config : null;
}

function getInitialBalanceFromConfig(mapping: any, selectedResponse: string | null): number | null {
  const config = getSelectedConfig(mapping, selectedResponse);
  if (!config) return null;
  const raw = config.initialBalance;
  const value = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN;
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function getOrCreateMapping(userId: string): any {
  const matches = getStorage().findByUniqueKey(MAPPINGS_COLLECTION, 'userId', userId);
  if (matches.length > 0) return matches[0];
  const mapping = {
    responses: {},
    configs: {},
    uniqueKeys: {
      userId
    },
    timestamp: new Date().toISOString()
  };
  const id = getStorage().insert(MAPPINGS_COLLECTION, mapping);
  return { ...mapping, id };
}

function getWalletBalance(mapping: any, initialBalanceOverride?: number | null): number {
  const existing = mapping?.configs?.[SERVICE_NAME]?.walletBalance;
  const value = typeof existing === 'string' || typeof existing === 'number' ? Number(existing) : NaN;
  if (Number.isFinite(value) && value >= 0) return value;
  return initialBalanceOverride ?? DEFAULT_BALANCE;
}

function persistWalletBalance(mapping: any, balance: number): void {
  getStorage().updateById(MAPPINGS_COLLECTION, mapping.id, () => ({
    configs: {
      ...(mapping.configs ?? {}),
      [SERVICE_NAME]: {
        ...(mapping.configs?.[SERVICE_NAME] ?? {}),
        walletBalance: balance
      }
    }
  }));
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
  const userId = getUserId(req) ?? 'default';
  const mapping = getOrCreateMapping(userId);
  const selectedResponse = getSelectedResponse(req);
  const initialBalanceOverride = getInitialBalanceFromConfig(mapping, selectedResponse);
  const balance = getWalletBalance(mapping, initialBalanceOverride);
  persistWalletBalance(mapping, balance);

  res.status(200).json({
    resultCode: 0,
    retailerId,
    balance
  });
});

router.post('/v1/api/test/retailer/load-promo', (req, res) => {
  const retailerId = getRetailerId(req);
  const amount = parseAmount(req);
  const userId = getUserId(req) ?? 'default';
  const selectedResponse = getSelectedResponse(req);
  const mapping = getOrCreateMapping(userId);
  const initialBalanceOverride = getInitialBalanceFromConfig(mapping, selectedResponse);
  const walletBalance = getWalletBalance(mapping, initialBalanceOverride);

  if (amount === null) {
    return res.status(400).json({
      resultCode: 4001,
      error: 'bad_request',
      message: 'Invalid promo load amount. Provide a positive number in amount or promoAmount.'
    });
  }

  const currentBalance = walletBalance;

  if (selectedResponse === 'bad_request') {
    return res.status(400).json({
      resultCode: 4001,
      error: 'bad_request',
      message: 'Bad request (forced by user mapping).'
    });
  }

  if (selectedResponse === 'insufficient_balance') {
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
  persistWalletBalance(mapping, remainingBalance);

  return res.status(200).json({
    resultCode: 0,
    message: 'Promo load successful.',
    retailerId,
    loadedAmount: amount,
    remainingBalance
  });
});

export default router;
