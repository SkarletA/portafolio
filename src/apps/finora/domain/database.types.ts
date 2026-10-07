export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          is_household: boolean
          monthly_limit: number
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          is_household?: boolean
          monthly_limit: number
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          is_household?: boolean
          monthly_limit?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          translation_key: string | null
        }
        Insert: {
          color?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          translation_key?: string | null
        }
        Update: {
          color?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          translation_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_transfers: {
        Row: {
          amount: number
          created_at: string
          date: string
          goal_id: string
          id: string
          kind: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          goal_id: string
          id?: string
          kind: string
          transaction_id?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          goal_id?: string
          id?: string
          kind?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_transfers_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_transfers_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string | null
          current_amount: number
          id: string
          name: string
          target_amount: number
          target_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_amount?: number
          id?: string
          name: string
          target_amount: number
          target_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_amount?: number
          id?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          household_id: string
          id: string
          invited_by: string
          status: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          household_id: string
          id?: string
          invited_by: string
          status: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          currency: string
          date_of_birth: string | null
          first_name: string | null
          language: string
          last_name: string | null
          nationality: string | null
          phone: string | null
          theme: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          currency?: string
          date_of_birth?: string | null
          first_name?: string | null
          language?: string
          last_name?: string | null
          nationality?: string | null
          phone?: string | null
          theme?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          currency?: string
          date_of_birth?: string | null
          first_name?: string | null
          language?: string
          last_name?: string | null
          nationality?: string | null
          phone?: string | null
          theme?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_expense_terms: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string
          effective_from: string
          id: string
          is_household_expense: boolean
          is_shared: boolean
          owner_share_amount: number | null
          payment_method: string
          recurring_expense_id: string
          savings_goal_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          effective_from: string
          id?: string
          is_household_expense?: boolean
          is_shared?: boolean
          owner_share_amount?: number | null
          payment_method: string
          recurring_expense_id: string
          savings_goal_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          effective_from?: string
          id?: string
          is_household_expense?: boolean
          is_shared?: boolean
          owner_share_amount?: number | null
          payment_method?: string
          recurring_expense_id?: string
          savings_goal_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expense_terms_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expense_terms_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expense_terms_savings_goal_id_fkey"
            columns: ["savings_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expenses: {
        Row: {
          created_at: string
          day_of_month: number
          ended_on: string | null
          frequency: string
          id: string
          last_error: string | null
          last_error_at: string | null
          start_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_month: number
          ended_on?: string | null
          frequency?: string
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          start_on: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_month?: number
          ended_on?: string | null
          frequency?: string
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          start_on?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_occurrences: {
        Row: {
          created_at: string
          id: string
          posted_without_household: boolean
          recurring_expense_id: string
          scheduled_date: string
          term_version_id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          posted_without_household?: boolean
          recurring_expense_id: string
          scheduled_date: string
          term_version_id: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          posted_without_household?: boolean
          recurring_expense_id?: string
          scheduled_date?: string
          term_version_id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_occurrences_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_occurrences_term_version_id_fkey"
            columns: ["term_version_id"]
            isOneToOne: false
            referencedRelation: "recurring_expense_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_occurrences_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_payments: {
        Row: {
          amount: number
          id: string
          payment_method: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          payment_method: string
          transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          payment_method?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_shares: {
        Row: {
          amount: number
          id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_shares_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          date: string
          description: string
          funding_source: string
          id: string
          installment_months: number
          is_household_expense: boolean
          is_shared: boolean
          last_installment_date: string | null
          notes: string | null
          refunds_transaction_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          description: string
          funding_source?: string
          id?: string
          installment_months?: number
          is_household_expense?: boolean
          is_shared?: boolean
          last_installment_date?: string | null
          notes?: string | null
          refunds_transaction_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          description?: string
          funding_source?: string
          id?: string
          installment_months?: number
          is_household_expense?: boolean
          is_shared?: boolean
          last_installment_date?: string | null
          notes?: string | null
          refunds_transaction_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_refunds_transaction_id_fkey"
            columns: ["refunds_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_household_invite: { Args: never; Returns: string }
      cancel_recurring_expense: {
        Args: { p_ended_on: string; p_id: string; p_today: string }
        Returns: undefined
      }
      create_goal: {
        Args: {
          p_name: string
          p_opening_balance: number
          p_target_amount: number
          p_target_date: string
          p_today: string
        }
        Returns: string
      }
      create_recurring_expense:
        | {
            Args: {
              p_amount: number
              p_category_id: string
              p_day_of_month: number
              p_description: string
              p_payment_method: string
              p_today: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_category_id: string
              p_day_of_month: number
              p_description: string
              p_is_shared?: boolean
              p_owner_share_amount?: number
              p_payment_method: string
              p_today: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_category_id: string
              p_day_of_month: number
              p_description: string
              p_is_household_expense?: boolean
              p_is_shared?: boolean
              p_owner_share_amount?: number
              p_payment_method: string
              p_today: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_category_id: string
              p_day_of_month: number
              p_description: string
              p_is_household_expense?: boolean
              p_is_shared?: boolean
              p_owner_share_amount?: number
              p_payment_method: string
              p_savings_goal_id?: string
              p_today: string
            }
            Returns: string
          }
      current_household_id: { Args: never; Returns: string }
      decline_household_invite: { Args: never; Returns: undefined }
      get_household_partner: {
        Args: never
        Returns: {
          avatar_url: string
          first_name: string
          last_name: string
          user_id: string
        }[]
      }
      household_member_ids: { Args: never; Returns: string[] }
      invite_household_member: { Args: { p_email: string }; Returns: string }
      leave_household: { Args: never; Returns: undefined }
      post_my_recurring_expenses: { Args: { p_today: string }; Returns: number }
      save_transaction: {
        Args: {
          p_amount: number
          p_category_id: string
          p_date: string
          p_description: string
          p_id: string
          p_installment_months: number
          p_is_household_expense?: boolean
          p_notes: string
          p_payments: Json
          p_refunds_transaction_id?: string
          p_savings_goal_id: string
          p_shares?: Json
          p_type: string
        }
        Returns: string
      }
      update_goal: {
        Args: {
          p_id: string
          p_name: string
          p_target_amount: number
          p_target_date: string
        }
        Returns: undefined
      }
      update_recurring_expense:
        | {
            Args: {
              p_amount: number
              p_category_id: string
              p_description: string
              p_effective_from: string
              p_id: string
              p_payment_method: string
              p_today: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_category_id: string
              p_description: string
              p_effective_from: string
              p_id: string
              p_is_shared?: boolean
              p_owner_share_amount?: number
              p_payment_method: string
              p_today: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_category_id: string
              p_description: string
              p_effective_from: string
              p_id: string
              p_is_household_expense?: boolean
              p_is_shared?: boolean
              p_owner_share_amount?: number
              p_payment_method: string
              p_today: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_category_id: string
              p_description: string
              p_effective_from: string
              p_id: string
              p_is_household_expense?: boolean
              p_is_shared?: boolean
              p_owner_share_amount?: number
              p_payment_method: string
              p_savings_goal_id?: string
              p_today: string
            }
            Returns: string
          }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
