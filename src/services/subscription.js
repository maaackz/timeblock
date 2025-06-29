import { loadStripe } from '@stripe/stripe-js';

export class SubscriptionService {
    constructor() {
        this.stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
    }

    async createCheckoutSession() {
        try {
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: 'price_pro_monthly', // This would be your actual Stripe price ID
                }),
            });

            const session = await response.json();
            
            if (session.error) {
                throw new Error(session.error);
            }

            const stripe = await this.stripePromise;
            const { error } = await stripe.redirectToCheckout({
                sessionId: session.id,
            });

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Subscription error:', error);
            alert('Failed to start subscription process. Please try again.');
        }
    }

    async getSubscriptionStatus() {
        try {
            const response = await fetch('/api/subscription-status');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to get subscription status:', error);
            return { status: 'free' };
        }
    }

    async cancelSubscription() {
        try {
            const response = await fetch('/api/cancel-subscription', {
                method: 'POST',
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to cancel subscription:', error);
            throw error;
        }
    }
}