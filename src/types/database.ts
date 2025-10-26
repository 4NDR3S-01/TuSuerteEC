export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      payment_transactions: {
        Row: {
          admin_comment: string | null
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          payment_method_id: string
          raffle_id: string | null
          receipt_reference: string | null
          receipt_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_payment_status: string | null
          subscription_id: string | null
          transaction_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_comment?: string | null
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_method_id: string
          raffle_id?: string | null
          receipt_reference?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
          subscription_id?: string | null
          transaction_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_comment?: string | null
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_method_id?: string
          raffle_id?: string | null
          receipt_reference?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
          subscription_id?: string | null
          transaction_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      [key: string]: any
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_total_revenue: {
        Args: never
        Returns: {
          total: number
        }[]
      }
      [key: string]: any
    }
    Enums: {
      [_ in never]: never
    }
  }
}
