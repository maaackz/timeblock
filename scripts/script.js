document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    let selectedEvent = null;
    let selectedInfo = null;

    const defaultEvents = [
        { title: 'The Contemporary World', daysOfWeek: [5], startTime: '11:00', endTime: '14:30', color: '#007bff', textColor: '#ffffff' },
        { title: 'Euthenics', daysOfWeek: [5], startTime: '09:50', endTime: '10:50', color: '#28a745', textColor: '#ffffff' },
        { title: 'Fundamentals of Programming', daysOfWeek: [3], startTime: '11:00', endTime: '14:30', color: '#ffc107', textColor: '#000000' },
        { title: 'Introduction to Information Technology', daysOfWeek: [3], startTime: '14:30', endTime: '18:00', color: '#17a2b8', textColor: '#ffffff' },
        { title: 'Movement Competency Training/Fitness', daysOfWeek: [5], startTime: '14:45', endTime: '16:45', color: '#6f42c1', textColor: '#ffffff' },
        { title: 'Science, Technology, and Society', daysOfWeek: [2], startTime: '14:30', endTime: '18:00', color: '#fd7e14', textColor: '#000000' },
        { title: 'Understanding the Self', daysOfWeek: [2], startTime: '11:00', endTime: '14:30', color: '#dc3545', textColor: '#ffffff' }
    ];

    // Initialize localStorage once
    if (!localStorage.getItem('calendarEvents')) {
        localStorage.setItem('calendarEvents', JSON.stringify(defaultEvents));
    }

    function expandRecurring(events) {
        return events.map(ev => {
            if (ev.daysOfWeek && ev.startTime && ev.endTime) {
                return {
                    title: ev.title,
                    daysOfWeek: ev.daysOfWeek,
                    startTime: ev.startTime,
                    endTime: ev.endTime,
                    color: ev.color,
                    textColor: ev.textColor,
                    display: 'block',
                    allDay: false,
                    extendedProps: {
                        daysOfWeek: ev.daysOfWeek,
                        startTime: ev.startTime,
                        endTime: ev.endTime
                    }
                };
            } else {
                return {
                    title: ev.title,
                    start: ev.start,
                    end: ev.end,
                    color: ev.color,
                    textColor: ev.textColor,
                    allDay: false
                };
            }
        });
    }

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        slotDuration: '00:30:00',
        snapDuration: '00:05:00',
        allDaySlot: false,
        editable: true,
        selectable: true,
        nowIndicator: true,
        selectMirror: true,
        eventOverlap: true,
        slotMinTime: '00:00:00',
        slotMaxTime: '24:00:00',
        scrollTime: '00:00:00',
        slotLabelInterval: '01:00',
        slotLabelFormat: { hour: 'numeric', minute: '2-digit', hour12: true },
        height: 'auto',
        expandRows: true,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay'
        },
        events: expandRecurring(JSON.parse(localStorage.getItem('calendarEvents'))),

        select(info) {
            selectedInfo = info;
            selectedEvent = null;
            openModal('', info.startStr.slice(11, 16), info.endStr.slice(11, 16), [], '#007bff', '#ffffff');
        },

        eventClick(info) {
            selectedEvent = info.event;
            selectedInfo = null;
            const dow = selectedEvent.extendedProps?.daysOfWeek || [];
            openModal(
                selectedEvent.title,
                selectedEvent.startStr.slice(11, 16),
                selectedEvent.endStr.slice(11, 16),
                dow,
                selectedEvent.backgroundColor,
                selectedEvent.textColor
            );
        }
    });

    function saveEvents(events) {
        localStorage.setItem('calendarEvents', JSON.stringify(events));
    }

    function openModal(title, startTime, endTime, days, color, textColor) {
        document.getElementById('modalTitle').value = title;
        document.getElementById('modalStartTime').value = startTime;
        document.getElementById('modalEndTime').value = endTime;
        document.getElementById('modalColor').value = color;
        document.getElementById('modalTextColor').value = textColor;
        const select = document.getElementById('modalDaysOfWeek');
        Array.from(select.options).forEach(opt => opt.selected = days.includes(opt.value));
        updatePreview();
        document.getElementById('eventModal').style.display = 'block';
        document.getElementById('modalBackdrop').style.display = 'block';
    }

    function closeModal() {
        document.getElementById('eventModal').style.display = 'none';
        document.getElementById('modalBackdrop').style.display = 'none';
    }

    function saveModalEvent() {
        const title = document.getElementById('modalTitle').value;
        const startTime = document.getElementById('modalStartTime').value;
        const endTime = document.getElementById('modalEndTime').value;
        const color = document.getElementById('modalColor').value;
        const textColor = document.getElementById('modalTextColor').value;
        const days = Array.from(document.getElementById('modalDaysOfWeek').selectedOptions).map(o => o.value);

        const stored = JSON.parse(localStorage.getItem('calendarEvents') || '[]');

        // Remove old instance if editing
        if (selectedEvent) {
            const titleMatch = selectedEvent.title;
            const startMatch = selectedEvent.startStr;
            const filtered = stored.filter(ev =>
                ev.title !== titleMatch || (ev.start !== startMatch && !ev.startTime)
            );
            stored.length = 0;
            stored.push(...filtered);
        }

        const isCrossMidnight = startTime > endTime;

        // Add new event
        if (selectedInfo && days.length === 0) {
            // Simple non-recurring block from selection
            stored.push({
                title,
                start: selectedInfo.startStr,
                end: selectedInfo.endStr,
                allDay: false,
                color,
                textColor
            });
        } else if (days.length > 0) {
            // Recurring event (with or without crossing midnight)
            days.forEach(dow => {
                if (isCrossMidnight) {
                    // Part 1: Current day block to 23:59
                    stored.push({
                        title,
                        daysOfWeek: [dow],
                        startTime,
                        endTime: '23:59',
                        color,
                        textColor,
                        allDay: false
                    });

                    // Part 2: Next day block from 00:00
                    const nextDay = (parseInt(dow) + 1) % 7;
                    stored.push({
                        title,
                        daysOfWeek: [nextDay.toString()],
                        startTime: '00:00',
                        endTime,
                        color,
                        textColor,
                        allDay: false
                    });
                } else {
                    // Normal recurring event
                    stored.push({
                        title,
                        daysOfWeek: [dow],
                        startTime,
                        endTime,
                        color,
                        textColor,
                        allDay: false
                    });
                }
            });
        } else if (selectedEvent) {
            // Editing a fixed (non-recurring) block
            stored.push({
                title,
                start: selectedEvent.startStr,
                end: selectedEvent.endStr,
                color,
                textColor,
                allDay: false
            });
        }

        saveEvents(stored);
        closeModal();
        calendar.removeAllEvents();
        calendar.addEventSource(expandRecurring(stored));
    }


    function deleteModalEvent() {
        if (selectedEvent) {
            const stored = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
            const filtered = stored.filter(ev =>
                ev.title !== selectedEvent.title || (ev.start !== selectedEvent.startStr && !ev.startTime)
            );
            saveEvents(filtered);
            calendar.removeAllEvents();
            calendar.addEventSource(expandRecurring(filtered));
        }
        closeModal();
    }

    function updatePreview() {
        const bg = document.getElementById('modalColor').value;
        const fg = document.getElementById('modalTextColor').value;
        const preview = document.getElementById('colorPreview');
        preview.style.backgroundColor = bg;
        preview.style.color = fg;
        preview.textContent = 'Preview';
    }

    calendar.render();

    // Menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('menuDropdown').classList.toggle('hidden');
    });

    // Export JSON
    document.getElementById('exportBtn').addEventListener('click', () => {
        const events = localStorage.getItem('calendarEvents') || '[]';
        const blob = new Blob([events], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'calendar-events.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import JSON
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const imported = JSON.parse(event.target.result);
                localStorage.setItem('calendarEvents', JSON.stringify(imported));
                calendar.removeAllEvents();
                calendar.addEventSource(expandRecurring(imported));
            } catch (err) {
                alert('Invalid JSON file.');
            }
        };
        reader.readAsText(file);
    });

    // Button bindings
    document.getElementById('saveBtn').addEventListener('click', saveModalEvent);
    document.getElementById('deleteBtn').addEventListener('click', deleteModalEvent);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
});
