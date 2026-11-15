// Hand-written to match supabase/migrations. Replace with
// `supabase gen types typescript` after the project is linked.

export type RewardStatus =
  | "new"
  | "vetted"
  | "queued"
  | "claimed"
  | "paid"
  | "rejected";

export type PostApprovalState =
  | "draft"
  | "needs_review"
  | "approved"
  | "scheduled";

type OpportunityRow = {
  id: string;
  user_id: string;
  title: string;
  source: string | null;
  app: string | null;
  platform: string | null;
  category: string | null;
  status: RewardStatus;
  payout_cents: number | null;
  est_minutes: number | null;
  dollars_per_hour: number | null;
  currency: string;
  vetter_score: number | null;
  priority: number;
  external_url: string | null;
  notes: string | null;
  remind_only: boolean;
  created_at: string;
  updated_at: string;
};

type OfferRow = {
  id: string;
  user_id: string;
  opportunity_id: string | null;
  title: string;
  source: string | null;
  app: string | null;
  platform: string | null;
  status: RewardStatus;
  payout_cents: number | null;
  est_minutes: number | null;
  dollars_per_hour: number | null;
  currency: string;
  vetter_score: number | null;
  terms_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ReferralLinkRow = {
  id: string;
  user_id: string;
  opportunity_id: string | null;
  label: string;
  category: string | null;
  app: string | null;
  platform: string | null;
  url: string;
  referral_rate_percent: number | null;
  payout_per_signup_cents: number | null;
  signups: number;
  priority: number;
  status: RewardStatus;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PayoutRow = {
  id: string;
  user_id: string;
  opportunity_id: string | null;
  offer_id: string | null;
  source: string | null;
  app: string | null;
  category: string | null;
  amount_cents: number;
  currency: string;
  status: RewardStatus;
  expected_on: string | null;
  paid_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountCadence = "daily" | "24h" | "weekly" | "monthly" | "none";

type ConnectedAccountRow = {
  id: string;
  user_id: string;
  app_name: string;
  category: string;
  username: string | null;
  referral_url: string | null;
  referral_code: string | null;
  cadence: AccountCadence;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type WalletAddressRow = {
  id: string;
  user_id: string;
  label: string | null;
  address: string;
  created_at: string;
};

type PostRow = {
  id: string;
  user_id: string;
  referral_link_id: string | null;
  channel: string;
  title: string | null;
  body: string;
  approval_state: PostApprovalState;
  disclosure: string;
  character_count: number | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
};

type Insert<Row extends Record<string, unknown>> = {
  [Key in keyof Row]?: Row[Key] | null;
};

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Insert<Row>;
  Update: Insert<Row>;
  Relationships: Relationship[];
};

export type Database = {
  public: {
    Tables: {
      opportunities: Table<OpportunityRow>;
      offers: Table<OfferRow> & {
        Relationships: [
          {
            foreignKeyName: "offers_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      referral_links: Table<ReferralLinkRow> & {
        Relationships: [
          {
            foreignKeyName: "referral_links_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      payouts: Table<PayoutRow> & {
        Relationships: [
          {
            foreignKeyName: "payouts_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payouts_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: Table<PostRow> & {
        Relationships: [
          {
            foreignKeyName: "posts_referral_link_id_fkey";
            columns: ["referral_link_id"];
            isOneToOne: false;
            referencedRelation: "referral_links";
            referencedColumns: ["id"];
          },
        ];
      };
      connected_accounts: Table<ConnectedAccountRow>;
      wallet_addresses: Table<WalletAddressRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      reward_status: RewardStatus;
      post_approval_state: PostApprovalState;
    };
  };
};
