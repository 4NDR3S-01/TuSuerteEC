export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      cities: {
        Row: {
          id: number
          name: string
          country_id: number
        }
        Insert: {
          id?: number
          name: string
          country_id: number
        }
        Update: {
          id?: number
          name?: string
          country_id?: number
        }
      }
      countries: {
        Row: {
          id: number
          code: string
          name: string
        }
        Insert: {
          id?: number
          code: string
          name: string
        }
        Update: {
          id?: number
          code?: string
          name?: string
        }
      }
      live_events: {
        Row: {
          id: string
          title: string
          description: string | null
          start_at: string
          countdown_start_at: string | null
          stream_url: string | null
          raffle_id: string | null
          status: 'scheduled' | 'live' | 'completed' | 'canceled'
          is_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          start_at: string
          countdown_start_at?: string | null
          stream_url?: string | null
          raffle_id?: string | null
          status?: 'scheduled' | 'live' | 'completed' | 'canceled'
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          start_at?: string
          countdown_start_at?: string | null
          stream_url?: string | null
          raffle_id?: string | null
          status?: 'scheduled' | 'live' | 'completed' | 'canceled'
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      parishes: {
        Row: {
          id: number
          name: string
          city_id: number
        }
        Insert: {
          id?: number
          name: string
          city_id: number
        }
        Update: {
          id?: number
          name?: string
          city_id?: number
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          amount: number
          currency: string
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_method: string | null
          transaction_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          amount: number
          currency?: string
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_method?: string | null
          transaction_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          amount?: number
          currency?: string
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_method?: string | null
          transaction_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          currency: string
          interval: 'month' | 'year'
          stripe_price_id: string | null
          benefits: Json
          is_active: boolean
          max_concurrent_raffles: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          currency?: string
          interval: 'month' | 'year'
          stripe_price_id?: string | null
          benefits?: Json
          is_active?: boolean
          max_concurrent_raffles?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          currency?: string
          interval?: 'month' | 'year'
          stripe_price_id?: string | null
          benefits?: Json
          is_active?: boolean
          max_concurrent_raffles?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          id_number: string
          phone_number: string
          city_id: number | null
          parish_id: number | null
          address: string
          role: 'participant' | 'staff' | 'admin'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          id_number: string
          phone_number: string
          city_id?: number | null
          parish_id?: number | null
          address: string
          role: 'participant' | 'staff' | 'admin'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          id_number?: string
          phone_number?: string
          city_id?: number | null
          parish_id?: number | null
          address?: string
          role?: 'participant' | 'staff' | 'admin'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      raffle_entries: {
        Row: {
          id: string
          raffle_id: string
          user_id: string
          entry_source: 'subscription' | 'manual_purchase'
          subscription_id: string | null
          ticket_number: string
          is_winner: boolean
          created_at: string
        }
        Insert: {
          id?: string
          raffle_id: string
          user_id: string
          entry_source: 'subscription' | 'manual_purchase'
          subscription_id?: string | null
          ticket_number: string
          is_winner?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          raffle_id?: string
          user_id?: string
          entry_source?: 'subscription' | 'manual_purchase'
          subscription_id?: string | null
          ticket_number?: string
          is_winner?: boolean
          created_at?: string
        }
      }
      raffles: {
        Row: {
          id: string
          title: string
          description: string | null
          prize_description: string
          image_url: string | null
          status: 'draft' | 'active' | 'closed' | 'drawn' | 'completed'
          entry_mode: 'subscribers_only' | 'tickets_only' | 'hybrid'
          start_date: string
          end_date: string
          draw_date: string
          max_entries_per_user: number | null
          total_winners: number
          draw_algorithm: string
          draw_seed: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          prize_description: string
          image_url?: string | null
          status?: 'draft' | 'active' | 'closed' | 'drawn' | 'completed'
          entry_mode?: 'subscribers_only' | 'tickets_only' | 'hybrid'
          start_date: string
          end_date: string
          draw_date: string
          max_entries_per_user?: number | null
          total_winners?: number
          draw_algorithm?: string
          draw_seed?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          prize_description?: string
          image_url?: string | null
          status?: 'draft' | 'active' | 'closed' | 'drawn' | 'completed'
          entry_mode?: 'subscribers_only' | 'tickets_only' | 'hybrid'
          start_date?: string
          end_date?: string
          draw_date?: string
          max_entries_per_user?: number | null
          total_winners?: number
          draw_algorithm?: string
          draw_seed?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: 'active' | 'canceled' | 'past_due' | 'expired'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          status: 'active' | 'canceled' | 'past_due' | 'expired'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          status?: 'active' | 'canceled' | 'past_due' | 'expired'
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      winners: {
        Row: {
          id: string
          raffle_id: string
          entry_id: string
          user_id: string
          prize_position: number
          status: 'pending_contact' | 'contacted' | 'prize_delivered' | 'rejected'
          contact_attempts: number
          contacted_at: string | null
          delivered_at: string | null
          notes: string | null
          testimonial: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          raffle_id: string
          entry_id: string
          user_id: string
          prize_position?: number
          status?: 'pending_contact' | 'contacted' | 'prize_delivered' | 'rejected'
          contact_attempts?: number
          contacted_at?: string | null
          delivered_at?: string | null
          notes?: string | null
          testimonial?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          raffle_id?: string
          entry_id?: string
          user_id?: string
          prize_position?: number
          status?: 'pending_contact' | 'contacted' | 'prize_delivered' | 'rejected'
          contact_attempts?: number
          contacted_at?: string | null
          delivered_at?: string | null
          notes?: string | null
          testimonial?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
