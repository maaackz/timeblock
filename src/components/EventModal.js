export class EventModal {
    constructor(app) {
        this.app = app;
        this.currentEvent = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const form = document.getElementById('eventForm');
        const saveBtn = document.getElementById('saveEventBtn');
        const deleteBtn = document.getElementById('deleteEventBtn');
        const cancelBtn = document.getElementById('cancelEventBtn');
        const colorInput = document.getElementById('eventColor');
        const textColorInput = document.getElementById('eventTextColor');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEvent();
        });

        deleteBtn.addEventListener('click', () => {
            if (this.currentEvent && confirm('Are you sure you want to delete this event?')) {
                this.deleteEvent();
            }
        });

        cancelBtn.addEventListener('click', () => {
            this.hide();
        });

        // Update preview when colors change
        [colorInput, textColorInput].forEach(input => {
            input.addEventListener('input', () => {
                this.updatePreview();
            });
        });
    }

    show(event = null, defaults = {}) {
        this.currentEvent = event;
        
        // Reset form
        document.getElementById('eventForm').reset();
        
        if (event) {
            // Edit existing event
            document.getElementById('modalTitle').textContent = 'Edit Event';
            document.getElementById('eventTitle').value = event.title || '';
            document.getElementById('eventStartTime').value = event.start_time ? 
                this.formatDateTimeLocal(new Date(event.start_time)) : '';
            document.getElementById('eventEndTime').value = event.end_time ? 
                this.formatDateTimeLocal(new Date(event.end_time)) : '';
            document.getElementById('eventColor').value = event.background_color || '#2874A6';
            document.getElementById('eventTextColor').value = event.text_color || '#ffffff';
            document.getElementById('eventTags').value = event.tags || '';
            document.getElementById('eventRecurring').value = event.recurring || 'none';
            document.getElementById('deleteEventBtn').style.display = 'block';
        } else {
            // Create new event
            document.getElementById('modalTitle').textContent = 'New Event';
            document.getElementById('eventStartTime').value = defaults.start_time || '';
            document.getElementById('eventEndTime').value = defaults.end_time || '';
            document.getElementById('eventColor').value = '#2874A6';
            document.getElementById('eventTextColor').value = '#ffffff';
            document.getElementById('deleteEventBtn').style.display = 'none';
        }

        this.updatePreview();
        
        // Show modal
        document.getElementById('eventModal').classList.remove('hidden');
        document.getElementById('modalBackdrop').classList.remove('hidden');
        
        // Focus on title input
        document.getElementById('eventTitle').focus();
    }

    hide() {
        document.getElementById('eventModal').classList.add('hidden');
        document.getElementById('modalBackdrop').classList.add('hidden');
        this.currentEvent = null;
    }

    async saveEvent() {
        const eventData = {
            title: document.getElementById('eventTitle').value,
            start_time: document.getElementById('eventStartTime').value,
            end_time: document.getElementById('eventEndTime').value,
            background_color: document.getElementById('eventColor').value,
            text_color: document.getElementById('eventTextColor').value,
            tags: document.getElementById('eventTags').value,
            recurring: document.getElementById('eventRecurring').value
        };

        // Validation
        if (!eventData.title.trim()) {
            alert('Please enter a title for the event.');
            return;
        }

        if (!eventData.start_time || !eventData.end_time) {
            alert('Please set both start and end times.');
            return;
        }

        // Convert to proper ISO format with timezone handling
        const startDate = new Date(eventData.start_time);
        const endDate = new Date(eventData.end_time);

        if (startDate >= endDate) {
            alert('End time must be after start time.');
            return;
        }

        // Convert to ISO string for storage
        eventData.start_time = startDate.toISOString();
        eventData.end_time = endDate.toISOString();

        // Add ID if editing existing event
        if (this.currentEvent) {
            eventData.id = this.currentEvent.id;
        }

        try {
            await this.app.saveEvent(eventData);
            this.hide();
        } catch (error) {
            alert('Failed to save event: ' + error.message);
        }
    }

    async deleteEvent() {
        if (!this.currentEvent) return;

        try {
            await this.app.deleteEvent(this.currentEvent.id);
            this.hide();
        } catch (error) {
            alert('Failed to delete event: ' + error.message);
        }
    }

    updatePreview() {
        const preview = document.getElementById('colorPreview');
        const bgColor = document.getElementById('eventColor').value;
        const textColor = document.getElementById('eventTextColor').value;
        
        preview.style.backgroundColor = bgColor;
        preview.style.color = textColor;
        preview.textContent = 'Preview';
    }

    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
}