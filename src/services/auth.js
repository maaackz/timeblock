import { supabase, isSupabaseConfigured } from './supabase.js';

export class AuthService {
    constructor() {
        this.user = null;
    }

    async signUp(email, password) {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) throw error;
        return data;
    }

    async signIn(email, password) {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        this.user = data.user;
        return data;
    }

    async signOut() {
        if (!isSupabaseConfigured()) {
            return;
        }

        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        this.user = null;
    }

    async getCurrentUser() {
        if (!isSupabaseConfigured()) {
            return null;
        }

        const { data: { user } } = await supabase.auth.getUser();
        this.user = user;
        return user;
    }

    isAuthenticated() {
        return this.user !== null;
    }
}