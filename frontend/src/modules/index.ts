/**
 * Modules barrel — aggregates all feature module exports.
 *
 * ⚠️  For lazy-loaded routes (App.tsx / routes/index.tsx), always import
 *     from the specific page file so Vite creates correct code-split chunks:
 *       lazy(() => import('@/modules/finance/pages/DailyExpense'))
 *
 *     Use THIS barrel only for synchronous, non-route consumers.
 */

export * from './dashboard';
export * from './finance';
export * from './sales';
export * from './inventory';
export * from './hr';
export * from './reports';
