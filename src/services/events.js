import { supabase, isSupabaseConfigured } from './supabase.js';

export class EventService {
    constructor() {
        this.tableName = 'events';
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
                // Create new
                eventData.id = Date.now().toString();
                events.push(eventData);
            }
            
            localStorage.setItem('calendar-events', JSON.stringify(events));
            return eventData;
        }

        if (eventData.id) {
            // Update existing event
            const { data, error } = await supabase
                .from(this.tableName)
                .update(eventData)
                .eq('id', eventData.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Create new event
            const { data, error } = await supabase
                .from(this.tableName)
                .insert([eventData])
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
}