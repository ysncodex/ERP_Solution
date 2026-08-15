import type { Request, Response } from 'express';
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
} from './suppliers.service.js';
import { supplierCreateSchema, supplierUpdateSchema } from './suppliers.schema.js';

function serializeSupplier(row: Awaited<ReturnType<typeof listSuppliers>>[number]) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSuppliersHandler(_req: Request, res: Response) {
  const rows = await listSuppliers();
  res.json(rows.map(serializeSupplier));
}

export async function getSupplierHandler(req: Request, res: Response) {
  const row = await getSupplier(String(req.params.id));
  res.json(serializeSupplier(row));
}

export async function createSupplierHandler(req: Request, res: Response) {
  const data = supplierCreateSchema.parse(req.body);
  const row = await createSupplier(data);
  res.status(201).json(serializeSupplier(row));
}

export async function updateSupplierHandler(req: Request, res: Response) {
  const data = supplierUpdateSchema.parse(req.body);
  const row = await updateSupplier(String(req.params.id), data);
  res.json(serializeSupplier(row));
}

export async function deleteSupplierHandler(req: Request, res: Response) {
  await deleteSupplier(String(req.params.id));
  res.status(204).send();
}
