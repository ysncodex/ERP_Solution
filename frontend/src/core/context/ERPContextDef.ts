import { createContext } from 'react';
import type { ERPContextType } from '@/core/types';

export const ERPContext = createContext<ERPContextType | undefined>(undefined);
