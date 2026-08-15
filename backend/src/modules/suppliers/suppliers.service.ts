import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import type { SupplierCreateInput, SupplierUpdateInput } from './suppliers.schema.js';

export async function listSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: 'asc' } });
}

export async function getSupplier(id: string) {
  const row = await prisma.supplier.findUnique({ where: { id } });
  if (!row) throw ApiError.notFound('Supplier not found');
  return row;
}

export async function createSupplier(data: SupplierCreateInput) {
  const existing = await prisma.supplier.findFirst({
    where: { name: { equals: data.name, mode: 'insensitive' } },
  });
  if (existing) throw ApiError.conflict('A supplier with this name already exists');

  return prisma.supplier.create({ data });
}

export async function updateSupplier(id: string, data: SupplierUpdateInput) {
  await getSupplier(id);

  if (data.name) {
    const clash = await prisma.supplier.findFirst({
      where: {
        name: { equals: data.name, mode: 'insensitive' },
        NOT: { id },
      },
    });
    if (clash) throw ApiError.conflict('A supplier with this name already exists');
  }

  return prisma.supplier.update({ where: { id }, data });
}

export async function deleteSupplier(id: string) {
  await getSupplier(id);
  await prisma.supplier.delete({ where: { id } });
}
