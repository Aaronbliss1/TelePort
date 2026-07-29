/**
 * Local representation of the Supabase schema. Regenerate this from the
 * linked project before production releases; it includes the per-user wallet
 * migration in supabase/schema_user_wallets.sql.
 */
type TransferKind = 'DEV_WALLET' | 'GATEWAY' | 'BRIDGE';

interface TransferFields {
  id: string;
  treasury_id: string | null;
  user_id: string | null;
  kind: TransferKind;
  source_chain_key: string;
  destination_chain_key: string;
  source_address: string;
  destination_address: string;
  amount: string;
  circle_transaction_id: string | null;
  gateway_transfer_id: string | null;
  source_tx_hash: string | null;
  destination_tx_hash: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      user_wallets: {
        Row: {
          id: string;
          user_id: string;
          circle_wallet_id: string;
          chain_key: string;
          circle_blockchain: string;
          address: string;
          account_type: string;
          state: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          circle_wallet_id: string;
          chain_key: string;
          circle_blockchain: string;
          address: string;
          account_type?: string;
          state?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_wallets']['Insert']>;
        Relationships: [];
      };
      transfers: {
        Row: TransferFields;
        Insert: Omit<TransferFields, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          treasury_id?: string | null;
          user_id?: string | null;
          circle_transaction_id?: string | null;
          gateway_transfer_id?: string | null;
          source_tx_hash?: string | null;
          destination_tx_hash?: string | null;
          status?: string;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['transfers']['Insert']>;
        Relationships: [];
      };
      circle_webhook_events: {
        Row: {
          id: string;
          notification_id: string | null;
          notification_type: string;
          payload: Record<string, unknown>;
          received_at: string;
        };
        Insert: {
          id?: string;
          notification_id?: string | null;
          notification_type: string;
          payload: Record<string, unknown>;
          received_at?: string;
        };
        Update: Partial<Database['public']['Tables']['circle_webhook_events']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
