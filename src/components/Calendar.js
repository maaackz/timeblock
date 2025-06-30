export class Calendar {
    constructor(app) {
        this.app = app;
        this.calendarEl = document.getElementById('calendar');
        this.draggedEvent = null;
        this.resizeHandle = null;
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
        this.setupDragAndDrop();
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
        
        // Time slots with events positioned absolutely
        html += '<div class="week-body">';
        
        // Create time slots first
        for (let hour = 0; hour < 24; hour++) {
            html += '<div class="time-row">';
            html += `<div class="time-label">${this.formatHour(hour)}</div>`;
            
            for (let day = 0; day < 7; day++) {
                const currentDay = new Date(startOfWeek);
                currentDay.setDate(startOfWeek.getDate() + day);
                
                html += `
                    <div class="time-slot" 
                         data-date="${currentDay.toISOString().split('T')[0]}" 
                         data-hour="${hour}">
                    </div>
                `;
            }
            html += '</div>';
        }
        
        html += '</div>';
        
        // Add events as absolutely positioned elements
        html += '<div class="week-events-container">';
        for (let day = 0; day < 7; day++) {
            const currentDay = new Date(startOfWeek);
            currentDay.setDate(startOfWeek.getDate() + day);
            const dayEvents = this.getEventsForDate(currentDay);
            
            dayEvents.forEach(event => {
                html += this.renderWeekEventBlock(event, day, currentDay);
            });
        }
        html += '</div>';
        
        html += '</div>';
        
        this.calendarEl.innerHTML = html;
        this.attachEventListeners();
        this.setupDragAndDrop();
    }

    renderDayView() {
        const date = new Date(this.app.currentDate);
        
        let html = '<div class="calendar-grid day-view">';
        html += `<div class="day-header today">
            <h3>${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
        </div>`;
        
        html += '<div class="day-body">';
        for (let hour = 0; hour < 24; hour++) {
            html += `
                <div class="time-row">
                    <div class="time-label">${this.formatHour(hour)}</div>
                    <div class="time-slot" 
                         data-date="${date.toISOString().split('T')[0]}" 
                         data-hour="${hour}">
                    </div>
                </div>
            `;
        }
        html += '</div>';
        
        // Add events as absolutely positioned elements
        html += '<div class="day-events-container">';
        const dayEvents = this.getEventsForDate(date);
        dayEvents.forEach(event => {
            html += this.renderDayEventBlock(event, date);
        });
        html += '</div>';
        
        html += '</div>';
        
        this.calendarEl.innerHTML = html;
        this.attachEventListeners();
        this.setupDragAndDrop();
    }

    renderWeekEventBlock(event, dayIndex, currentDay) {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        
        // Skip if event doesn't occur on this day
        const eventStartDate = start.toISOString().split('T')[0];
        const eventEndDate = end.toISOString().split('T')[0];
        const currentDayStr = currentDay.toISOString().split('T')[0];
        
        if (currentDayStr < eventStartDate || currentDayStr > eventEndDate) {
            return '';
        }
        
        // Calculate position and dimensions
        const startHour = currentDayStr === eventStartDate ? start.getHours() : 0;
        const startMinutes = currentDayStr === eventStartDate ? start.getMinutes() : 0;
        const endHour = currentDayStr === eventEndDate ? end.getHours() : 24;
        const endMinutes = currentDayStr === eventEndDate ? end.getMinutes() : 0;
        
        // Skip events with same start and end time
        if (startHour === endHour && startMinutes === endMinutes) {
            return '';
        }
        
        const topOffset = (startHour * 60 + startMinutes) * 1; // 1px per minute
        const totalMinutes = (endHour * 60 + endMinutes) - (startHour * 60 + startMinutes);
        const height = Math.max(20, totalMinutes * 1); // Minimum 20px height
        
        // Calculate left position (80px for time column + day width)
        const dayWidth = `calc((100% - 80px) / 7)`;
        const leftOffset = `calc(80px + ${dayIndex} * ${dayWidth} + 2px)`;
        const width = `calc(${dayWidth} - 4px)`;
        
        return `
            <div class="event-block week-event" 
                 style="background-color: ${event.background_color}; 
                        color: ${event.text_color}; 
                        height: ${height}px;
                        top: ${topOffset}px;
                        left: ${leftOffset};
                        width: ${width};
                        position: absolute;
                        z-index: 10;"
                 data-event-id="${event.id}"
                 draggable="true">
                <div class="event-title">${event.title}</div>
                <div class="event-time">${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                <div class="resize-handle resize-handle-bottom"></div>
                <div class="resize-handle resize-handle-top"></div>
            </div>
        `;
    }

    renderDayEventBlock(event, currentDay) {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        
        // Skip if event doesn't occur on this day
        const eventStartDate = start.toISOString().split('T')[0];
        const eventEndDate = end.toISOString().split('T')[0];
        const currentDayStr = currentDay.toISOString().split('T')[0];
        
        if (currentDayStr < eventStartDate || currentDayStr > eventEndDate) {
            return '';
        }
        
        // Calculate position and dimensions
        const startHour = currentDayStr === eventStartDate ? start.getHours() : 0;
        const startMinutes = currentDayStr === eventStartDate ? start.getMinutes() : 0;
        const endHour = currentDayStr === eventEndDate ? end.getHours() : 24;
        const endMinutes = currentDayStr === eventEndDate ? end.getMinutes() : 0;
        
        // Skip events with same start and end time
        if (startHour === endHour && startMinutes === endMinutes) {
            return '';
        }
        
        const topOffset = (startHour * 60 + startMinutes) * 1; // 1px per minute
        const totalMinutes = (endHour * 60 + endMinutes) - (startHour * 60 + startMinutes);
        const height = Math.max(20, totalMinutes * 1); // Minimum 20px height
        
        return `
            <div class="event-block day-event" 
                 style="background-color: ${event.background_color}; 
                        color: ${event.text_color}; 
                        height: ${height}px;
                        top: ${topOffset}px;
                        left: calc(80px + 2px);
                        right: 2px;
                        position: absolute;
                        z-index: 10;"
                 data-event-id="${event.id}"
                 draggable="true">
                <div class="event-title">${event.title}</div>
                <div class="event-time">${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                <div class="resize-handle resize-handle-bottom"></div>
                <div class="resize-handle resize-handle-top"></div>
            </div>
        `;
    }

    getEventsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.app.events.filter(event => {
            const eventStart = new Date(event.start_time);
            const eventEnd = new Date(event.end_time);
            const eventStartDate = eventStart.toISOString().split('T')[0];
            const eventEndDate = eventEnd.toISOString().split('T')[0];
            
            // Check if event spans this date
            return dateStr >= eventStartDate && dateStr <= eventEndDate;
        });
    }

    getEventsForTimeSlot(date, hour) {
        const dateStr = date.toISOString().split('T')[0];
        return this.app.events.filter(event => {
            const eventStart = new Date(event.start_time);
            const eventEnd = new Date(event.end_time);
            const eventStartDate = eventStart.toISOString().split('T')[0];
            const eventEndDate = eventEnd.toISOString().split('T')[0];
            
            // Check if event is active during this hour on this date
            if (dateStr < eventStartDate || dateStr > eventEndDate) return false;
            
            const eventStartHour = eventStart.getHours();
            const eventEndHour = eventEnd.getHours();
            const eventStartMinutes = eventStart.getMinutes();
            const eventEndMinutes = eventEnd.getMinutes();
            
            // If it's the start date, check if hour is after start time
            if (dateStr === eventStartDate && hour < eventStartHour) return false;
            if (dateStr === eventStartDate && hour === eventStartHour && eventStartMinutes > 0 && hour < eventStartHour + 1) return false;
            
            // If it's the end date, check if hour is before end time
            if (dateStr === eventEndDate && hour >= eventEndHour) return false;
            if (dateStr === eventEndDate && hour === eventEndHour - 1 && eventEndMinutes === 0) return false;
            
            return true;
        });
    }

    renderEventPreview(event) {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        const isMultiDay = start.toDateString() !== end.toDateString();
        
        return `
            <div class="event-preview ${isMultiDay ? 'multi-day' : ''}" 
                 style="background-color: ${event.background_color}; color: ${event.text_color}"
                 data-event-id="${event.id}"
                 draggable="true">
                ${event.title}
                ${isMultiDay ? '<span class="multi-day-indicator">↔</span>' : ''}
                <div class="resize-handle resize-handle-right"></div>
            </div>
        `;
    }

    renderEventBlock(event, currentHour) {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        
        // Calculate position and height based on time
        const startHour = start.getHours();
        const startMinutes = start.getMinutes();
        const endHour = end.getHours();
        const endMinutes = end.getMinutes();
        
        // Calculate top offset within the hour slot
        const topOffset = currentHour === startHour ? (startMinutes / 60) * 60 : 0;
        
        // Calculate height
        let height;
        if (currentHour === startHour && currentHour === endHour) {
            // Event starts and ends in same hour
            height = ((endMinutes - startMinutes) / 60) * 60;
        } else if (currentHour === startHour) {
            // Event starts in this hour
            height = ((60 - startMinutes) / 60) * 60;
        } else if (currentHour === endHour) {
            // Event ends in this hour
            height = (endMinutes / 60) * 60;
        } else {
            // Event spans full hour
            height = 60;
        }
        
        height = Math.max(20, height); // Minimum height
        
        return `
            <div class="event-block" 
                 style="background-color: ${event.background_color}; 
                        color: ${event.text_color}; 
                        height: ${height}px;
                        top: ${topOffset}px"
                 data-event-id="${event.id}"
                 draggable="true">
                <div class="event-title">${event.title}</div>
                <div class="event-time">${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                <div class="resize-handle resize-handle-bottom"></div>
                <div class="resize-handle resize-handle-top"></div>
            </div>
        `;
    }

    setupDragAndDrop() {
        // Setup event dragging
        this.calendarEl.querySelectorAll('.event-preview, .event-block').forEach(eventEl => {
            eventEl.addEventListener('dragstart', (e) => {
                this.draggedEvent = {
                    id: eventEl.dataset.eventId,
                    element: eventEl
                };
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', eventEl.dataset.eventId);
                eventEl.style.opacity = '0.5';
            });

            eventEl.addEventListener('dragend', (e) => {
                eventEl.style.opacity = '1';
                this.draggedEvent = null;
            });
        });

        // Setup drop zones
        this.calendarEl.querySelectorAll('.calendar-day, .time-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', (e) => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                
                if (this.draggedEvent) {
                    this.moveEvent(this.draggedEvent.id, slot);
                } else {
                    // Handle template drop
                    try {
                        const templateData = e.dataTransfer.getData('application/json');
                        if (templateData) {
                            const template = JSON.parse(templateData);
                            this.app.templateManager.createEventFromTemplate(template, slot);
                        }
                    } catch (error) {
                        console.error('Failed to handle drop:', error);
                    }
                }
            });
        });

        // Setup resize handles
        this.setupResizeHandles();
    }

    setupResizeHandles() {
        this.calendarEl.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                const eventEl = handle.closest('.event-preview, .event-block');
                const eventId = eventEl.dataset.eventId;
                const event = this.app.events.find(e => e.id === eventId);
                
                if (!event) return;
                
                this.startResize(event, handle, e);
            });
        });
    }

    startResize(event, handle, startEvent) {
        const isBottom = handle.classList.contains('resize-handle-bottom');
        const isTop = handle.classList.contains('resize-handle-top');
        const isRight = handle.classList.contains('resize-handle-right');
        
        const startY = startEvent.clientY;
        const startX = startEvent.clientX;
        const originalStart = new Date(event.start_time);
        const originalEnd = new Date(event.end_time);
        
        const mouseMoveHandler = (e) => {
            const deltaY = e.clientY - startY;
            const deltaX = e.clientX - startX;
            
            if (isBottom) {
                // Resize end time
                const hoursDelta = Math.round(deltaY / 60); // Assuming 60px per hour
                const newEnd = new Date(originalEnd.getTime() + (hoursDelta * 60 * 60 * 1000));
                if (newEnd > originalStart) {
                    event.end_time = newEnd.toISOString();
                }
            } else if (isTop) {
                // Resize start time
                const hoursDelta = Math.round(deltaY / 60);
                const newStart = new Date(originalStart.getTime() + (hoursDelta * 60 * 60 * 1000));
                if (newStart < originalEnd) {
                    event.start_time = newStart.toISOString();
                }
            } else if (isRight) {
                // Resize duration (for month view)
                const daysDelta = Math.round(deltaX / 100); // Approximate day width
                const newEnd = new Date(originalEnd.getTime() + (daysDelta * 24 * 60 * 60 * 1000));
                if (newEnd > originalStart) {
                    event.end_time = newEnd.toISOString();
                }
            }
            
            this.render(); // Re-render to show changes
        };
        
        const mouseUpHandler = () => {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            
            // Save the resized event
            this.app.saveEvent(event);
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    moveEvent(eventId, targetSlot) {
        const event = this.app.events.find(e => e.id === eventId);
        if (!event) return;
        
        const targetDate = targetSlot.dataset.date;
        const targetHour = targetSlot.dataset.hour || '09';
        
        if (!targetDate) return;
        
        const originalStart = new Date(event.start_time);
        const originalEnd = new Date(event.end_time);
        const duration = originalEnd.getTime() - originalStart.getTime();
        
        // Create new start time
        const newStart = new Date(`${targetDate}T${targetHour.padStart(2, '0')}:${originalStart.getMinutes().toString().padStart(2, '0')}`);
        const newEnd = new Date(newStart.getTime() + duration);
        
        // Update event
        event.start_time = newStart.toISOString();
        event.end_time = newEnd.toISOString();
        
        // Save and re-render
        this.app.saveEvent(event);
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
            start_time: this.formatDateTimeLocal(startTime),
            end_time: this.formatDateTimeLocal(endTime)
        });
    }

    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
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