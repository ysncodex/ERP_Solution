import type { ReactNode } from 'react';
import type { Transaction } from '@/core/types';

export interface ManagerPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  requiredRole?: 'owner' | 'manager';
}

export interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSave: (updated: Transaction) => void;
  itemNames: string[];
  suppliers: string[];
}

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ManageListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: string[];
  emptyText?: string;
  onRename: (oldValue: string, newValue: string) => void;
  onDelete: (value: string) => void;
}
