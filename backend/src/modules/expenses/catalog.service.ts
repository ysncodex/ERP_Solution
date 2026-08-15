import { prisma } from '../../lib/prisma.js';
import { normalizeCatalogName } from '../../utils/normalizeName.js';

export async function ensureFixedCostItem(name: string) {
  const normalized = normalizeCatalogName(name);
  const existing = await prisma.fixedCostItem.findFirst({
    where: { name: { equals: normalized, mode: 'insensitive' } },
  });
  if (existing) return existing;
  return prisma.fixedCostItem.create({ data: { name: normalized } });
}

export async function ensureProductCostItem(name: string) {
  const normalized = normalizeCatalogName(name);
  const existing = await prisma.productCostItem.findFirst({
    where: { name: { equals: normalized, mode: 'insensitive' } },
  });
  if (existing) return existing;
  return prisma.productCostItem.create({ data: { name: normalized } });
}

export async function findSupplierByName(name: string) {
  const normalized = normalizeCatalogName(name);
  return prisma.supplier.findFirst({
    where: { name: { equals: normalized, mode: 'insensitive' } },
  });
}

export async function listFixedCostItems() {
  return prisma.fixedCostItem.findMany({ orderBy: { name: 'asc' } });
}

export async function listProductCostItems() {
  return prisma.productCostItem.findMany({ orderBy: { name: 'asc' } });
}

export async function renameFixedCostItem(id: string, name: string) {
  const normalized = normalizeCatalogName(name);
  return prisma.fixedCostItem.update({ where: { id }, data: { name: normalized } });
}

export async function renameProductCostItem(id: string, name: string) {
  const normalized = normalizeCatalogName(name);
  return prisma.productCostItem.update({ where: { id }, data: { name: normalized } });
}

export async function deleteFixedCostItem(id: string) {
  await prisma.fixedCostItem.delete({ where: { id } });
}

export async function deleteProductCostItem(id: string) {
  await prisma.productCostItem.delete({ where: { id } });
}
