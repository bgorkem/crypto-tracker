/**
 * Database types generated from Supabase schema
 * Auto-generated - DO NOT EDIT MANUALLY
 * 
 * To regenerate: npm run db:types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TransactionType = 'BUY' | 'SELL'

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      portfolios: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          base_currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          base_currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          base_currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          portfolio_id: string
          symbol: string
          type: TransactionType
          quantity: number
          price_per_unit: number
          transaction_date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          symbol: string
          type: TransactionType
          quantity: number
          price_per_unit: number
          transaction_date: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          symbol?: string
          type?: TransactionType
          quantity?: number
          price_per_unit?: number
          transaction_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      portfolio_snapshots: {
        Row: {
          id: string
          portfolio_id: string
          total_value: number
          total_cost: number
          total_pl: number
          total_pl_pct: number
          holdings_count: number
          snapshot_date: string
          created_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          total_value: number
          total_cost: number
          total_pl: number
          total_pl_pct: number
          holdings_count?: number
          snapshot_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          total_value?: number
          total_cost?: number
          total_pl?: number
          total_pl_pct?: number
          holdings_count?: number
          snapshot_date?: string
          created_at?: string
        }
      }
      price_cache: {
        Row: {
          symbol: string
          price_usd: number
          market_cap: number | null
          volume_24h: number | null
          change_24h_pct: number | null
          last_updated: string
          created_at: string
        }
        Insert: {
          symbol: string
          price_usd: number
          market_cap?: number | null
          volume_24h?: number | null
          change_24h_pct?: number | null
          last_updated?: string
          created_at?: string
        }
        Update: {
          symbol?: string
          price_usd?: number
          market_cap?: number | null
          volume_24h?: number | null
          change_24h_pct?: number | null
          last_updated?: string
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      transaction_type: TransactionType
    }
  }
}
