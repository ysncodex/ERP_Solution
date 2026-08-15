import { api } from '../client';

export interface CatalogItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const catalogService = {
  getFixedItems: () => api.get<CatalogItem[]>('/expenses/catalog/fixed-items'),

  createFixedItem: (name: string) =>
    api.post<CatalogItem>('/expenses/catalog/fixed-items', { name }),

  renameFixedItem: (id: string, name: string) =>
    api.put<CatalogItem>(`/expenses/catalog/fixed-items/${id}`, { name }),

  deleteFixedItem: (id: string) => api.delete<void>(`/expenses/catalog/fixed-items/${id}`),

  getProductItems: () => api.get<CatalogItem[]>('/expenses/catalog/product-items'),

  createProductItem: (name: string) =>
    api.post<CatalogItem>('/expenses/catalog/product-items', { name }),

  renameProductItem: (id: string, name: string) =>
    api.put<CatalogItem>(`/expenses/catalog/product-items/${id}`, { name }),

  deleteProductItem: (id: string) => api.delete<void>(`/expenses/catalog/product-items/${id}`),
};
