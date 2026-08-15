import { api } from '../client';
import type { MenuItem, MenuCategory } from '@/modules/sales/types/menuItem.types';

export interface MenuItemCreateData {
  name: string;
  category: MenuCategory;
  price: number;
  available?: boolean;
  description?: string;
}

export type MenuItemUpdateData = Partial<MenuItemCreateData>;

export const menuService = {
  getAll: async (params?: {
    category?: MenuCategory;
    available?: boolean;
    search?: string;
  }): Promise<MenuItem[]> => {
    const query: Record<string, string> = {};
    if (params?.category) query.category = params.category;
    if (params?.available !== undefined) query.available = String(params.available);
    if (params?.search) query.search = params.search;
    return api.get<MenuItem[]>('/menu', query);
  },

  getById: async (id: string): Promise<MenuItem> => {
    return api.get<MenuItem>(`/menu/${id}`);
  },

  create: async (data: MenuItemCreateData): Promise<MenuItem> => {
    return api.post<MenuItem>('/menu', data);
  },

  update: async (id: string, data: MenuItemUpdateData): Promise<MenuItem> => {
    return api.put<MenuItem>(`/menu/${id}`, data);
  },

  toggleAvailability: async (id: string): Promise<MenuItem> => {
    return api.patch<MenuItem>(`/menu/${id}/availability`);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/menu/${id}`);
  },
};
