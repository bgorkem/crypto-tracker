import { z } from 'zod';

/**
 * Validation schemas for API requests
 * 
 * Uses Zod for runtime validation and TypeScript type inference.
 * All schemas enforce constraints from the database schema and business logic.
 */

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

export const RegisterSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
  displayName: z
    .string()
    .max(100, 'Display name must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

// =============================================================================
// PORTFOLIO SCHEMAS
// =============================================================================

export const CreatePortfolioSchema = z.object({
  name: z
    .string()
    .min(1, 'Portfolio name is required')
    .max(100, 'Portfolio name must be less than 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
  base_currency: z.string().length(3, 'Currency code must be 3 characters').optional(),
});

export const UpdatePortfolioSchema = z.object({
  name: z
    .string()
    .min(1, 'Portfolio name is required')
    .max(100, 'Portfolio name must be less than 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
});

export type CreatePortfolioInput = z.infer<typeof CreatePortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof UpdatePortfolioSchema>;

// =============================================================================
// TRANSACTION SCHEMAS
// =============================================================================

export const CreateTransactionSchema = z.object({
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(20, 'Symbol must be less than 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Symbol must be uppercase alphanumeric')
    .transform((val) => val.toUpperCase()),
  type: z.enum(['BUY', 'SELL'], {
    errorMap: () => ({ message: 'Type must be BUY or SELL' }),
  }),
  quantity: z
    .number()
    .positive('Quantity must be greater than 0')
    .finite('Quantity must be a finite number'),
  price_per_unit: z
    .number()
    .positive('Price must be greater than 0')
    .finite('Price must be a finite number'),
  transaction_date: z
    .string()
    .datetime('Invalid datetime format')
    .refine(
      (date) => new Date(date) <= new Date(),
      'Transaction date cannot be in the future'
    ),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
});

export const UpdateTransactionSchema = z.object({
  quantity: z
    .number()
    .positive('Quantity must be greater than 0')
    .finite('Quantity must be a finite number')
    .optional(),
  price_per_unit: z
    .number()
    .positive('Price must be greater than 0')
    .finite('Price must be a finite number')
    .optional(),
  transaction_date: z
    .string()
    .datetime('Invalid datetime format')
    .refine(
      (date) => new Date(date) <= new Date(),
      'Transaction date cannot be in the future'
    )
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

// =============================================================================
// QUERY PARAMETER SCHEMAS
// =============================================================================

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(100),
});

export const TransactionFilterSchema = z.object({
  symbol: z.string().optional(),
  type: z.enum(['BUY', 'SELL']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(100),
});

export const PriceQuerySchema = z.object({
  symbols: z
    .string()
    .min(1, 'At least one symbol is required')
    .transform((val) => val.split(',').map((s) => s.trim().toUpperCase())),
});

export const ChartQuerySchema = z.object({
  interval: z.enum(['1h', '24h', '7d', '30d'], {
    errorMap: () => ({ message: 'Invalid interval. Must be 1h, 24h, 7d, or 30d' }),
  }),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type TransactionFilter = z.infer<typeof TransactionFilterSchema>;
export type PriceQuery = z.infer<typeof PriceQuerySchema>;
export type ChartQuery = z.infer<typeof ChartQuerySchema>;

// =============================================================================
// UUID VALIDATION
// =============================================================================

export const UUIDSchema = z
  .string()
  .uuid('Invalid UUID format');

export function isValidUUID(value: string): boolean {
  return UUIDSchema.safeParse(value).success;
}
