import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { parseMenuCategory } from '../../utils/menuCategory.js';
import { serializeMenuItem } from '../../utils/serializeMenu.js';
import {
  menuItemCreateSchema,
  menuItemUpdateSchema,
  menuListQuerySchema,
} from './menu.schema.js';

export async function listMenu(req: Request, res: Response) {
  const q = menuListQuerySchema.parse(req.query);

  const rows = await prisma.menuItem.findMany({
    where: {
      ...(q.category ? { category: parseMenuCategory(q.category) } : {}),
      ...(q.available !== undefined ? { available: q.available } : {}),
      ...(q.search
        ? { name: { contains: q.search, mode: 'insensitive' as const } }
        : {}),
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  res.json(rows.map(serializeMenuItem));
}

export async function getMenuItem(req: Request, res: Response) {
  const id = String(req.params.id);
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) throw ApiError.notFound('Menu item not found');
  res.json(serializeMenuItem(item));
}

export async function createMenuItem(req: Request, res: Response) {
  const data = menuItemCreateSchema.parse(req.body);
  const item = await prisma.menuItem.create({
    data: {
      name: data.name,
      category: parseMenuCategory(data.category),
      price: data.price,
      available: data.available,
      description: data.description,
    },
  });
  res.status(201).json(serializeMenuItem(item));
}

export async function updateMenuItem(req: Request, res: Response) {
  const id = String(req.params.id);
  const data = menuItemUpdateSchema.parse(req.body);
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Menu item not found');

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: parseMenuCategory(data.category) } : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.available !== undefined ? { available: data.available } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
    },
  });
  res.json(serializeMenuItem(item));
}

export async function toggleMenuAvailability(req: Request, res: Response) {
  const id = String(req.params.id);
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Menu item not found');

  // Explicitly flip the DB state safely
  const item = await prisma.menuItem.update({
    where: { id },
    data: { available: !existing.available },
  });
  res.json(serializeMenuItem(item));
}

export async function deleteMenuItem(req: Request, res: Response) {
  const id = String(req.params.id);
  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Menu item not found');
  await prisma.menuItem.delete({ where: { id } });
  res.status(204).send();
}
