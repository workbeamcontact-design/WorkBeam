import { projectId, publicAnonKey } from './supabase/info';
import { supabase } from './supabase/client';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-20084ff3`;

export interface SubscriptionStatus {
  active: boolean;
  status: 'none' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  trial_end: number | null;
  current_period_end: number | null;
  plan?: string;
  cancel_at_period_end?: boolean;
}

export class SubscriptionAPI {
  private static async getAuthHeaders(): Promise<HeadersInit> {
    // Get the current session from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || publicAnonKey;
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };
  }

  // Check subscription status
  static async getStatus(): Promise<SubscriptionStatus> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/subscription/status`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch subscription status');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      throw error;
    }
  }

  // Create checkout session and redirect to Stripe
  static async createCheckoutSession(priceId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/subscription/create-checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/?subscription=success`,
          cancelUrl: `${window.location.origin}/?subscription=canceled`
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (result.data.url) {
        // If in iframe, try to break out
        if (window.self !== window.top) {
          window.top!.location.href = result.data.url;
        } else {
          window.location.href = result.data.url;
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  // Create customer portal session and redirect
  static async openCustomerPortal(): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/subscription/create-portal`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          returnUrl: window.location.origin
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to open customer portal');
      }

      // Redirect to Stripe Customer Portal
      if (result.data.url) {
        // If in iframe, try to break out
        if (window.self !== window.top) {
          window.top!.location.href = result.data.url;
        } else {
          window.location.href = result.data.url;
        }
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      throw error;
    }
  }
}
