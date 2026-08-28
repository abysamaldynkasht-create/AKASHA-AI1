export type SubscriptionPlanId = 'free' | 'pro' | 'business' | 'enterprise';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'none';

export interface PlanFeature {
  text: string;
  included: boolean;
  isHighlight?: boolean;
}

export interface PlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  name_ar: string;
  badge_title: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: 'always_free' | 'monthly' | 'yearly' | 'custom';
  usage_limit: number; // Daily requests quota
  image_limit: number; // Daily images upload quota
  model_name: string;
  model_tier: 'standard' | 'pro_ultra' | 'dedicated';
  max_file_size_mb: number;
  allow_vision_upload: boolean;
  priority_streaming: boolean;
  custom_system_prompt: boolean;
  is_popular?: boolean;
  features: string[];
  excluded_features: string[];
}

export interface UserSubscription {
  plan: SubscriptionPlanId;
  subscription_status: SubscriptionStatus;
  subscription_id: string;
  subscription_start: string | null;
  subscription_end: string | null;
  usage_limit: number;
  usage_count: number;
  image_limit?: number;
  image_count?: number;
  last_reset_date: string; // YYYY-MM-DD
  cancel_at_period_end?: boolean;
}

export interface UserProfile extends UserSubscription {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  updatedAt?: string;
  role?: 'user' | 'admin';
}

export interface ChatAttachment {
  name: string;
  type: string;
  data: string;
  isImage?: boolean;
  size?: number;
}

export interface ChatMessage {
  id?: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
  createdAt: string;
  modelUsed?: string;
}

export interface ChatSession {
  id?: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
