import { api } from '../client';

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SupplierCreateData = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  notes?: string;
};

export type SupplierUpdateData = Partial<SupplierCreateData>;

export const suppliersService = {
  getAll: () => api.get<Supplier[]>('/suppliers'),

  getById: (id: string) => api.get<Supplier>(`/suppliers/${id}`),

  create: (data: SupplierCreateData) => api.post<Supplier>('/suppliers', data),

  update: (id: string, data: SupplierUpdateData) => api.put<Supplier>(`/suppliers/${id}`, data),

  delete: (id: string) => api.delete<void>(`/suppliers/${id}`),
};
