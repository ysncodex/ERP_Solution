import type { Request, Response } from 'express';
import { fundMovementCreateSchema, fundMovementsListQuerySchema } from './funds.schema.js';
import {
  createFundMovement,
  deleteFundMovement,
  getCombinedAccountBalances,
  getFundMovement,
  listFundAccounts,
  listFundMovements,
} from './funds.service.js';
import { serializeFundAccount, serializeFundMovement } from './funds.serialize.js';

export async function listMovements(req: Request, res: Response) {
  const query = fundMovementsListQuerySchema.parse(req.query);
  const rows = await listFundMovements(query);
  res.json(rows.map(serializeFundMovement));
}

export async function getMovement(req: Request, res: Response) {
  const id = String(req.params.id);
  const movement = await getFundMovement(id);
  res.json(serializeFundMovement(movement));
}

export async function createMovement(req: Request, res: Response) {
  const data = fundMovementCreateSchema.parse(req.body);
  const movement = await createFundMovement(data, req.user?.id);
  res.status(201).json(serializeFundMovement(movement));
}

export async function deleteMovement(req: Request, res: Response) {
  const id = String(req.params.id);
  await deleteFundMovement(id);
  res.status(204).send();
}

export async function getBalances(_req: Request, res: Response) {
  const balances = await getCombinedAccountBalances();
  res.json(balances);
}

export async function getAccounts(_req: Request, res: Response) {
  const accounts = await listFundAccounts();
  res.json(accounts.map(serializeFundAccount));
}
