export class Calendar {
    constructor(app) {
        this.app = app;
        this.calendarEl = document.getElementById('calendar');
    }

    render() {
        switch (this.app.currentView) {
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'day':
                this.renderDayView();
                break;
        }
    }

    renderMonthView() {
        const date = new Date(this.app.currentDate);
        const year = date.getFullYear();
        const month = date.getMonth();
        
        // Get first day of month and calculate grid
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        let html = '<div class="calendar-grid month-view">';
        
        // Header row
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        html += '<div class="calendar-header-row">';
        dayNames.forEach(day => {
            html += `<div class="calendar-header-cell">${day}</div>`;
        });
        html += '</div>';
        
        // Calendar days
        const currentDate = new Date(startDate);
        for (let week = 0; week < 6; week++) {
            html += '<div class="calendar-week">';
            for (let day = 0; day < 7; day++) {
                const isCurrentMonth = currentDate.getMonth() === month;
                const isToday = this.isToday(currentDate);
                const dayEvents = this.getEventsForDate(currentDate);
                
                html += `
                    <div class="calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}" 
                         data-date="${currentDate.toISOString().split('T')[0]}">
                        <div class="day-number">${currentDate.getDate()}</div>
                        <div class="day-events">
                            ${dayEvents.map(event => this.renderEventPreview(event)).join('')}
                        </div>
                    </div>
                `;
                currentDate.setDate(currentDate.getDate() + 1);
            }
            html += '</div>';
        }
        
        html += '</div>';
        this.calendarEl.innerHTML = html;
        this.attachEventListeners();
    }

    renderWeekView() {
        const date = new Date(this.app.currentDate);
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        
        let html = '<div class="calendar-grid week-view">';
        
        // Time column header
        html += '<div class="week-header">';
        html += '<div class="time-column-header"></div>';
        
        // Day headers
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            const isToday = this.isToday(day);
            
            html += `
                <div class="day-header ${isToday ? 'today' : ''}">
                    <div class="day-name">${day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div class="day-number">${day.getDate()}</div>
                </div>
            `;
        }
        html += '</div>';
        
        // Time slots
        html += '<div class="week-body">';
        for (let hour = 0; hour < 24; hour++) {
            html += '<div class="time-row">';
            html += `<div class="time-label">${this.formatHour(hour)}</div>`;
            
            for (let day = 0; day < 7; day++) {
                const currentDay = new Date(startOfWeek);
                currentDay.setDate(startOfWeek.getDate() + day);
                const slotEvents = this.getEventsForTimeSlot(currentDay, hour);
                
                html += `
                    <div class="time-slot" 
                         data-date="${currentDay.toISOString().split('T')[0]}" 
                         data-hour="${hour}">
                        ${slotEvents.map(event => this.renderEventBlock(event)).join('')}
                    </div>
                `;
            }
            html += '</div>';
        }
        html += '</div></div>';
        
        this.calendarEl.innerHTML = html;
        this.attachEventListeners();
    }

    renderDayView() {
        const date = new Date(this.app.currentDate);
        
        let html = '<div class="calendar-grid day-view">';
        html += `<div class="day-header today">
            <h3>${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
        </div>`;
        
        html += '<div class="day-body">';
        for (let hour = 0; hour < 24; hour++) {
            const slotEvents = this.getEventsForTimeSlot(date, hour);
            
            html += `
                <div class="time-row">
                    <div class="time-label">${this.formatHour(hour)}</div>
                    <div class="time-slot" 
                         data-date="${date.toISOString().split('T')[0]}" 
                         data-hour="${hour}">
                        ${slotEvents.map(event => this.renderEventBlock(event)).join('')}
                    </div>
                </div>
            `;
        }
        html += '</div></div>';
        
        this.calendarEl.innerHTML = html;
        this.attachEventListeners();
    }

    getEventsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.app.events.filter(event => {
            const eventDate = new Date(event.start_time).toISOString().split('T')[0];
            return eventDate === dateStr;
        });
    }

    getEventsForTimeSlot(date, hour) {
        const dateStr = date.toISOString().split('T')[0];
        return this.app.events.filter(event => {
            const eventStart = new Date(event.start_time);
            const eventEnd = new Date(event.end_time);
            const eventDateStr = eventStart.toISOString().split('T')[0];
            
            if (eventDateStr !== dateStr) return false;
            
            const eventStartHour = eventStart.getHours();
            const eventEndHour = eventEnd.getHours();
            
            return hour >= eventStartHour && hour < eventEndHour;
        });
    }

    renderEventPreview(event) {
        return `
            <div class="event-preview" 
                 style="background-color: ${event.background_color}; color: ${event.text_color}"
                 data-event-id="${event.id}">
                ${event.title}
            </div>
        `;
    }

    renderEventBlock(event) {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        const duration = (end - start) / (1000 * 60 * 60); // hours
        const height = Math.max(30, duration * 60); // minimum 30px
        
        return `
            <div class="event-block" 
                 style="background-color: ${event.background_color}; 
                        color: ${event.text_color}; 
                        height: ${height}px"
                 data-event-id="${event.id}">
                <div class="event-title">${event.title}</div>
                <div class="event-time">${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
            </div>
        `;
    }

    attachEventListeners() {
        // Click on empty calendar slots to create events
        this.calendarEl.querySelectorAll('.calendar-day, .time-slot').forEach(slot => {
            slot.addEventListener('click', (e) => {
                if (e.target === slot) {
                    this.handleSlotClick(slot);
                }
            });
        });

        // Click on events to edit them
        this.calendarEl.querySelectorAll('.event-preview, .event-block').forEach(eventEl => {
            eventEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventId = eventEl.dataset.eventId;
                const event = this.app.events.find(e => e.id === eventId);
                if (event) {
                    this.app.eventModal.show(event);
                }
            });
        });
    }

    handleSlotClick(slot) {
        const date = slot.dataset.date;
        const hour = slot.dataset.hour || '09';
        
        const startTime = new Date(`${date}T${hour.padStart(2, '0')}:00`);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
        
        this.app.eventModal.show(null, {
            start_time: startTime.toISOString().slice(0, 16),
            end_time: endTime.toISOString().slice(0, 16)
        });
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    formatHour(hour) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:00 ${period}`;
    }
}