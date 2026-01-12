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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          restaurant_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          restaurant_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_menu_categories: {
        Row: {
          branch_id: string
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_menu_categories_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_menu_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_menu_items: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          is_available: boolean
          menu_item_id: string
          price: number | null
          promo_end: string | null
          promo_label: string | null
          promo_price: number | null
          promo_start: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_available?: boolean
          menu_item_id: string
          price?: number | null
          promo_end?: string | null
          promo_label?: string | null
          promo_price?: number | null
          promo_start?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_available?: boolean
          menu_item_id?: string
          price?: number | null
          promo_end?: string | null
          promo_label?: string | null
          promo_price?: number | null
          promo_start?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_menu_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_menu_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_payment_methods: {
        Row: {
          branch_id: string
          cash_enabled: boolean
          created_at: string
          efawateer_enabled: boolean
          id: string
          mastercard_enabled: boolean
          updated_at: string
          visa_enabled: boolean
          wallet_enabled: boolean
        }
        Insert: {
          branch_id: string
          cash_enabled?: boolean
          created_at?: string
          efawateer_enabled?: boolean
          id?: string
          mastercard_enabled?: boolean
          updated_at?: string
          visa_enabled?: boolean
          wallet_enabled?: boolean
        }
        Update: {
          branch_id?: string
          cash_enabled?: boolean
          created_at?: string
          efawateer_enabled?: boolean
          id?: string
          mastercard_enabled?: boolean
          updated_at?: string
          visa_enabled?: boolean
          wallet_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "branch_payment_methods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          base_unit_id: string
          branch_id: string
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          min_level: number
          name: string
          reorder_point: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          base_unit_id: string
          branch_id: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          min_level?: number
          name: string
          reorder_point?: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          base_unit_id?: string
          branch_id?: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          min_level?: number
          name?: string
          reorder_point?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_levels: {
        Row: {
          branch_id: string
          item_id: string
          on_hand_base: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          item_id: string
          on_hand_base?: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          item_id?: string
          on_hand_base?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_levels_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_levels_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          id: string
          item_id: string
          notes: string | null
          qty: number
          qty_in_base: number
          reference_id: string | null
          reference_type: string | null
          restaurant_id: string
          txn_type: string
          unit_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          id?: string
          item_id: string
          notes?: string | null
          qty: number
          qty_in_base: number
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id: string
          txn_type: string
          unit_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string
          notes?: string | null
          qty?: number
          qty_in_base?: number
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id?: string
          txn_type?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_unit_conversions: {
        Row: {
          created_at: string
          from_unit_id: string
          id: string
          multiplier: number
          restaurant_id: string
          to_unit_id: string
        }
        Insert: {
          created_at?: string
          from_unit_id: string
          id?: string
          multiplier: number
          restaurant_id: string
          to_unit_id: string
        }
        Update: {
          created_at?: string
          from_unit_id?: string
          id?: string
          multiplier?: number
          restaurant_id?: string
          to_unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_unit_conversions_from_unit_id_fkey"
            columns: ["from_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_unit_conversions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_unit_conversions_to_unit_id_fkey"
            columns: ["to_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_units: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string
          symbol: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          symbol?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          symbol?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_units_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_modifier_groups: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          modifier_group_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          modifier_group_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          modifier_group_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_modifier_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_modifier_groups_modifier_group_id_fkey"
            columns: ["modifier_group_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          is_favorite: boolean
          is_offer: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          is_favorite?: boolean
          is_offer?: boolean
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          is_favorite?: boolean
          is_offer?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      modifier_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_required: boolean
          max_selections: number | null
          name: string
          restaurant_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          max_selections?: number | null
          name: string
          restaurant_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          max_selections?: number | null
          name?: string
          restaurant_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifier_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      modifier_options: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          modifier_group_id: string
          name: string
          price_adjustment: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          modifier_group_id: string
          name: string
          price_adjustment?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          modifier_group_id?: string
          name?: string
          price_adjustment?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifier_options_modifier_group_id_fkey"
            columns: ["modifier_group_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_modifiers: {
        Row: {
          created_at: string
          id: string
          modifier_name: string
          modifier_option_id: string
          option_name: string
          order_item_id: string
          price_adjustment: number
        }
        Insert: {
          created_at?: string
          id?: string
          modifier_name: string
          modifier_option_id: string
          option_name: string
          order_item_id: string
          price_adjustment?: number
        }
        Update: {
          created_at?: string
          id?: string
          modifier_name?: string
          modifier_option_id?: string
          option_name?: string
          order_item_id?: string
          price_adjustment?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_modifiers_modifier_option_id_fkey"
            columns: ["modifier_option_id"]
            isOneToOne: false
            referencedRelation: "modifier_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_modifiers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          name: string
          notes: string | null
          order_id: string
          price: number
          quantity: number
          restaurant_id: string
          void_reason: string | null
          voided: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name: string
          notes?: string | null
          order_id: string
          price: number
          quantity?: number
          restaurant_id: string
          void_reason?: string | null
          voided?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name?: string
          notes?: string | null
          order_id?: string
          price?: number
          quantity?: number
          restaurant_id?: string
          void_reason?: string | null
          voided?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string | null
          cancelled_reason: string | null
          created_at: string
          customer_phone: string | null
          discount_type: string | null
          discount_value: number | null
          id: string
          invoice_uuid: string | null
          notes: string | null
          order_notes: string | null
          order_number: number
          restaurant_id: string
          service_charge: number
          shift_id: string | null
          source: string
          status: string
          subtotal: number
          table_id: string | null
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          cancelled_reason?: string | null
          created_at?: string
          customer_phone?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          invoice_uuid?: string | null
          notes?: string | null
          order_notes?: string | null
          order_number?: number
          restaurant_id: string
          service_charge?: number
          shift_id?: string | null
          source?: string
          status?: string
          subtotal?: number
          table_id?: string | null
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          cancelled_reason?: string | null
          created_at?: string
          customer_phone?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          invoice_uuid?: string | null
          notes?: string | null
          order_notes?: string | null
          order_number?: number
          restaurant_id?: string
          service_charge?: number
          shift_id?: string | null
          source?: string
          status?: string
          subtotal?: number
          table_id?: string | null
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          id: string
          method: string
          order_id: string
          restaurant_id: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          created_at?: string
          id?: string
          method: string
          order_id: string
          restaurant_id: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          method?: string
          order_id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      purchase_receipt_lines: {
        Row: {
          created_at: string
          id: string
          item_id: string
          qty: number
          receipt_id: string
          unit_cost: number | null
          unit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          qty: number
          receipt_id: string
          unit_cost?: number | null
          unit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          qty?: number
          receipt_id?: string
          unit_cost?: number | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipt_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipt_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "purchase_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipt_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receipts: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          receipt_no: string
          received_at: string
          restaurant_id: string
          supplier_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          receipt_no: string
          received_at?: string
          restaurant_id: string
          supplier_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          receipt_no?: string
          received_at?: string
          restaurant_id?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          id: string
          order_id: string
          reason: string | null
          refund_type: string
          restaurant_id: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          reason?: string | null
          refund_type?: string
          restaurant_id: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          reason?: string | null
          refund_type?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_branches: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          phone: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          phone?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          phone?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_branches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_settings: {
        Row: {
          business_hours: Json | null
          created_at: string
          currency: string
          discount_type: string
          discounts_enabled: boolean
          id: string
          max_discount_value: number | null
          prices_include_tax: boolean
          restaurant_id: string
          rounding_enabled: boolean
          service_charge_rate: number
          tax_rate: number
          updated_at: string
        }
        Insert: {
          business_hours?: Json | null
          created_at?: string
          currency?: string
          discount_type?: string
          discounts_enabled?: boolean
          id?: string
          max_discount_value?: number | null
          prices_include_tax?: boolean
          restaurant_id: string
          rounding_enabled?: boolean
          service_charge_rate?: number
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          business_hours?: Json | null
          created_at?: string
          currency?: string
          discount_type?: string
          discounts_enabled?: boolean
          id?: string
          max_discount_value?: number | null
          prices_include_tax?: boolean
          restaurant_id?: string
          rounding_enabled?: boolean
          service_charge_rate?: number
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          branch_id: string | null
          capacity: number | null
          created_at: string
          id: string
          is_active: boolean
          restaurant_id: string
          table_code: string
          table_name: string
        }
        Insert: {
          branch_id?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          restaurant_id: string
          table_code: string
          table_name: string
        }
        Update: {
          branch_id?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          restaurant_id?: string
          table_code?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shift_transactions: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          id: string
          reason: string | null
          restaurant_id: string
          shift_id: string
          type: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          restaurant_id: string
          shift_id: string
          type: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          restaurant_id?: string
          shift_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_transactions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          branch_id: string | null
          cashier_id: string
          closed_at: string | null
          closing_cash: number | null
          created_at: string
          id: string
          opened_at: string
          opening_cash: number
          restaurant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          cashier_id: string
          closed_at?: string | null
          closing_cash?: number | null
          created_at?: string
          id?: string
          opened_at?: string
          opening_cash?: number
          restaurant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          cashier_id?: string
          closed_at?: string | null
          closing_cash?: number | null
          created_at?: string
          id?: string
          opened_at?: string
          opening_cash?: number
          restaurant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_count_lines: {
        Row: {
          actual_base: number
          created_at: string
          expected_base: number
          id: string
          item_id: string
          notes: string | null
          stock_count_id: string
          variance_base: number | null
        }
        Insert: {
          actual_base?: number
          created_at?: string
          expected_base?: number
          id?: string
          item_id: string
          notes?: string | null
          stock_count_id: string
          variance_base?: number | null
        }
        Update: {
          actual_base?: number
          created_at?: string
          expected_base?: number
          id?: string
          item_id?: string
          notes?: string | null
          stock_count_id?: string
          variance_base?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_count_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_lines_stock_count_id_fkey"
            columns: ["stock_count_id"]
            isOneToOne: false
            referencedRelation: "stock_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_counts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          restaurant_id: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          restaurant_id: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          restaurant_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_counts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          is_active: boolean
          restaurant_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          restaurant_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          restaurant_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "restaurant_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cashier_restaurant_id: { Args: { _user_id: string }; Returns: string }
      get_owner_restaurant_id: { Args: { _user_id: string }; Returns: string }
      get_public_restaurant: {
        Args: { p_restaurant_id: string }
        Returns: {
          id: string
          logo_url: string
          name: string
        }[]
      }
      get_restaurant_default_branch: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      get_restaurant_id_from_branch: {
        Args: { p_branch_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_branch_restaurant_active: {
        Args: { p_branch_id: string }
        Returns: boolean
      }
      is_restaurant_active: {
        Args: { p_restaurant_id: string }
        Returns: boolean
      }
      public_get_table_by_code: {
        Args: { p_restaurant_id: string; p_table_code: string }
        Returns: {
          branch_id: string
          id: string
          is_active: boolean
          table_code: string
          table_name: string
        }[]
      }
    }
    Enums: {
      app_role: "system_admin" | "owner" | "cashier"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["system_admin", "owner", "cashier"],
    },
  },
} as const
