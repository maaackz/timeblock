import { supabase, isSupabaseConfigured } from './supabase.js';
import { AuthService } from './auth.js';

export class EventService {
    constructor() {
        this.tableName = 'events';
        this.authService = new AuthService();
    }

    async getEvents() {
        if (!isSupabaseConfigured()) {
            // Fallback to localStorage
            const stored = localStorage.getItem('calendar-events');
            return stored ? JSON.parse(stored) : [];
        }

        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .order('start_time', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async saveEvent(eventData) {
        if (!isSupabaseConfigured()) {
            // Fallback to localStorage
            const events = JSON.parse(localStorage.getItem('calendar-events') || '[]');
            
            if (eventData.id) {
                // Update existing
                const index = events.findIndex(e => e.id === eventData.id);
                if (index !== -1) {
                    events[index] = eventData;
                }
            } else {
                // Create new - use numeric ID for localStorage
                eventData.id = Date.now().toString();
                events.push(eventData);
            }
            
            localStorage.setItem('calendar-events', JSON.stringify(events));
            return eventData;
        }

        // Get current user for Supabase operations
        const user = await this.authService.getCurrentUser();
        if (!user) {
            throw new Error('User must be authenticated to save events');
        }

        // Prepare event data with user_id
        const eventPayload = {
            ...eventData,
            user_id: user.id
        };

        if (eventData.id && this.isValidUUID(eventData.id)) {
            // Update existing event - only if ID is a valid UUID
            const { data, error } = await supabase
                .from(this.tableName)
                .update(eventPayload)
                .eq('id', eventData.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Create new event - remove any existing ID to let Supabase generate UUID
            const { id, ...eventWithoutId } = eventPayload;
            
            const { data, error } = await supabase
                .from(this.tableName)
                .insert([eventWithoutId])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    }

    async deleteEvent(eventId) {
        if (!isSupabaseConfigured()) {
            // Fallback to localStorage
            const events = JSON.parse(localStorage.getItem('calendar-events') || '[]');
            const filtered = events.filter(e => e.id !== eventId);
            localStorage.setItem('calendar-events', JSON.stringify(filtered));
            return;
        }

        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('id', eventId);

        if (error) throw error;
    }

    async getEventsByDateRange(startDate, endDate) {
        if (!isSupabaseConfigured()) {
            const events = await this.getEvents();
            return events.filter(event => {
                const eventDate = new Date(event.start_time);
                return eventDate >= startDate && eventDate <= endDate;
            });
        }

        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .gte('start_time', startDate.toISOString())
            .lte('start_time', endDate.toISOString())
            .order('start_time', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    // Helper method to validate UUID format
    isValidUUID(str) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }
}