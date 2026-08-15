import type { Request, Response } from 'express';
import { serializeSaleTransaction, serializeTransaction } from '../../utils/serialize.js';
import {
  saleCreateSchema,
  salesListQuerySchema,
  saleUpdateSchema,
  statsQuerySchema,
} from './sales.schema.js';
import {
  createSaleRecord,
  deleteSaleRecord,
  getSaleRecord,
  listSaleRecords,
  recentSaleRecords,
  saleStatsRecords,
  updateSaleRecord,
} from './sales.service.js';

export async function listSales(req: Request, res: Response) {
  const q = salesListQuerySchema.parse(req.query);

  // Optimization Implementation: Limit to 200 items unless explicitly requested to prevent browser UI freezing
  if (!q.limit && !q.startDate) {
    q.limit = 200;
  }

  const rows = await listSaleRecords(q);
  res.json(rows.map(serializeSaleTransaction));
}

export async function getSale(req: Request, res: Response) {
  const id = String(req.params.id);
  const sale = await getSaleRecord(id);
  res.json(serializeSaleTransaction(sale));
}

export async function createSale(req: Request, res: Response) {
  const data = saleCreateSchema.parse(req.body);
  const sale = await createSaleRecord(data);
  res.status(201).json(serializeSaleTransaction(sale));
}

export async function updateSale(req: Request, res: Response) {
  const id = String(req.params.id);
  const data = saleUpdateSchema.parse(req.body);
  const updated = await updateSaleRecord(id, data);
  res.json(serializeSaleTransaction(updated));
}

export async function deleteSale(req: Request, res: Response) {
  const id = String(req.params.id);
  await deleteSaleRecord(id);
  res.status(204).send();
}

export async function salesStats(req: Request, res: Response) {
  const q = statsQuerySchema.parse(req.query);
  const { byMethod, byChannel } = await saleStatsRecords(q);

  const sumFor = <T extends { _sum: { amount: unknown } }>(row: T | undefined) =>
    row ? Number(row._sum.amount ?? 0) : 0;

  const cashSales = sumFor(byMethod.find((r) => r.method === 'cash'));
  const bankSales = sumFor(byMethod.find((r) => r.method === 'bank'));
  const bkashSales = sumFor(byMethod.find((r) => r.method === 'bkash'));

  res.json({
    totalSales: cashSales + bankSales + bkashSales,
    cashSales,
    bankSales,
    bkashSales,
    salesByChannel: {
      in_store: sumFor(byChannel.find((r) => r.channel === 'in_store')),
      foodpanda: sumFor(byChannel.find((r) => r.channel === 'foodpanda')),
      foodi: sumFor(byChannel.find((r) => r.channel === 'foodi')),
    },
  });
}

export async function recentSales(req: Request, res: Response) {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 10), 1), 100);
  const rows = await recentSaleRecords(limit);
  res.json(rows.map(serializeTransaction));
}
