import { Calendar } from './Calendar.js';
import { Dashboard } from './Dashboard.js';
import { EventModal } from './EventModal.js';
import { TemplateManager } from './TemplateManager.js';
import { EventService } from '../services/events.js';
import { SubscriptionService } from '../services/subscription.js';

export class CalendarApp {
    constructor() {
        this.currentView = 'month';
        this.currentDate = new Date();
        this.events = [];
        
        this.eventService = new EventService();
        this.subscriptionService = new SubscriptionService();
        
        this.calendar = new Calendar(this);
        this.dashboard = new Dashboard(this);
        this.eventModal = new EventModal(this);
        this.templateManager = new TemplateManager(this);
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadEvents();
        this.render();
    }

    setupEventListeners() {
        // Menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('menuDropdown').classList.toggle('hidden');
        });

        // View toggles
        document.getElementById('toggleDashboardBtn').addEventListener('click', () => {
            this.toggleDashboard();
        });

        document.getElementById('openSettingsBtn').addEventListener('click', () => {
            this.toggleSettings();
        });

        document.getElementById('subscriptionBtn').addEventListener('click', () => {
            this.showSubscriptionModal();
        });

        // Calendar navigation
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.navigateCalendar(-1);
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            this.navigateCalendar(1);
        });

        // View buttons
        document.getElementById('monthViewBtn').addEventListener('click', () => {
            this.setView('month');
        });

        document.getElementById('weekViewBtn').addEventListener('click', () => {
            this.setView('week');
        });

        document.getElementById('dayViewBtn').addEventListener('click', () => {
            this.setView('day');
        });

        // Import/Export
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.importEvents(e.target.files[0]);
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportEvents();
        });

        // Settings
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Close modals when clicking backdrop
        document.getElementById('modalBackdrop').addEventListener('click', () => {
            this.closeAllModals();
        });
    }

    async loadEvents() {
        try {
            this.events = await this.eventService.getEvents();
            this.render();
        } catch (error) {
            console.error('Failed to load events:', error);
            // Load from localStorage as fallback
            const stored = localStorage.getItem('calendar-events');
            this.events = stored ? JSON.parse(stored) : [];
        }
    }

    async saveEvent(eventData) {
        try {
            const savedEvent = await this.eventService.saveEvent(eventData);
            if (eventData.id) {
                // Update existing event
                const index = this.events.findIndex(e => e.id === eventData.id);
                if (index !== -1) {
                    this.events[index] = savedEvent;
                }
            } else {
                // Add new event
                this.events.push(savedEvent);
            }
            this.render();
            return savedEvent;
        } catch (error) {
            console.error('Failed to save event:', error);
            // Fallback to localStorage
            if (eventData.id) {
                const index = this.events.findIndex(e => e.id === eventData.id);
                if (index !== -1) {
                    this.events[index] = eventData;
                }
            } else {
                eventData.id = Date.now().toString();
                this.events.push(eventData);
            }
            localStorage.setItem('calendar-events', JSON.stringify(this.events));
            this.render();
            return eventData;
        }
    }

    async deleteEvent(eventId) {
        try {
            await this.eventService.deleteEvent(eventId);
            this.events = this.events.filter(e => e.id !== eventId);
            this.render();
        } catch (error) {
            console.error('Failed to delete event:', error);
            // Fallback to localStorage
            this.events = this.events.filter(e => e.id !== eventId);
            localStorage.setItem('calendar-events', JSON.stringify(this.events));
            this.render();
        }
    }

    setView(view) {
        this.currentView = view;
        document.querySelectorAll('#viewToggle button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${view}ViewBtn`).classList.add('active');
        this.render();
    }

    navigateCalendar(direction) {
        const date = new Date(this.currentDate);
        
        switch (this.currentView) {
            case 'month':
                date.setMonth(date.getMonth() + direction);
                break;
            case 'week':
                date.setDate(date.getDate() + (direction * 7));
                break;
            case 'day':
                date.setDate(date.getDate() + direction);
                break;
        }
        
        this.currentDate = date;
        this.render();
    }

    toggleDashboard() {
        const calendarContainer = document.getElementById('calendarContainer');
        const dashboardView = document.getElementById('dashboardView');
        
        if (dashboardView.classList.contains('hidden')) {
            calendarContainer.classList.add('hidden');
            dashboardView.classList.remove('hidden');
            this.dashboard.render();
        } else {
            dashboardView.classList.add('hidden');
            calendarContainer.classList.remove('hidden');
        }
    }

    toggleSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        settingsPanel.classList.toggle('hidden');
    }

    showSubscriptionModal() {
        document.getElementById('subscriptionModal').classList.remove('hidden');
        document.getElementById('modalBackdrop').classList.remove('hidden');
        
        // Setup subscription handlers
        document.getElementById('closeSubscriptionModal').addEventListener('click', () => {
            this.closeAllModals();
        });

        document.querySelectorAll('.plan-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const plan = e.target.dataset.plan;
                if (plan === 'pro') {
                    await this.subscriptionService.createCheckoutSession();
                }
            });
        });
    }

    closeAllModals() {
        document.querySelectorAll('.hidden').forEach(el => {
            if (el.id.includes('Modal') || el.id === 'modalBackdrop') {
                el.classList.add('hidden');
            }
        });
        document.getElementById('eventModal').classList.add('hidden');
        document.getElementById('subscriptionModal').classList.add('hidden');
        document.getElementById('modalBackdrop').classList.add('hidden');
    }

    async importEvents(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const importedEvents = JSON.parse(text);
            
            for (const event of importedEvents) {
                await this.saveEvent(event);
            }
            
            alert('Events imported successfully!');
        } catch (error) {
            alert('Failed to import events: ' + error.message);
        }
    }

    exportEvents() {
        const dataStr = JSON.stringify(this.events, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `calendar-events-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    saveSettings() {
        const settings = {
            birthDate: document.getElementById('birthDate').value,
            lifespanYears: parseFloat(document.getElementById('lifespanYears').value) || 80,
        };
        
        if (settings.birthDate) {
            const birth = new Date(settings.birthDate);
            const death = new Date(birth.getTime() + (settings.lifespanYears * 365.25 * 24 * 60 * 60 * 1000));
            document.getElementById('deathDate').value = death.toISOString().slice(0, 16);
        }
        
        localStorage.setItem('calendar-settings', JSON.stringify(settings));
        alert('Settings saved!');
    }

    render() {
        this.calendar.render();
        this.updateHeader();
    }

    updateHeader() {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        let headerText = '';
        switch (this.currentView) {
            case 'month':
                headerText = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
                break;
            case 'week':
                const weekStart = new Date(this.currentDate);
                weekStart.setDate(this.currentDate.getDate() - this.currentDate.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                headerText = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
                break;
            case 'day':
                headerText = this.currentDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                break;
        }
        
        document.getElementById('currentMonth').textContent = headerText;
    }

    destroy() {
        // Cleanup if needed
    }
}