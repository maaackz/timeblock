document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    let selectedEvent = null;
    let selectedInfo = null;

    function generateUID() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    const defaultEvents = [
        { uid: generateUID(), group: generateUID(), title: 'The Contemporary World', daysOfWeek: [5], startTime: '11:00', endTime: '14:30', color: '#007bff', textColor: '#ffffff' },
        { uid: generateUID(), group: generateUID(), title: 'Euthenics', daysOfWeek: [5], startTime: '09:50', endTime: '10:50', color: '#28a745', textColor: '#ffffff' },
        { uid: generateUID(), group: generateUID(), title: 'Fundamentals of Programming', daysOfWeek: [3], startTime: '11:00', endTime: '14:30', color: '#ffc107', textColor: '#000000' },
        { uid: generateUID(), group: generateUID(), title: 'Introduction to Information Technology', daysOfWeek: [3], startTime: '14:30', endTime: '18:00', color: '#17a2b8', textColor: '#ffffff' },
        { uid: generateUID(), group: generateUID(), title: 'Movement Competency Training/Fitness', daysOfWeek: [5], startTime: '14:45', endTime: '16:45', color: '#6f42c1', textColor: '#ffffff' },
        { uid: generateUID(), group: generateUID(), title: 'Science, Technology, and Society', daysOfWeek: [2], startTime: '14:30', endTime: '18:00', color: '#fd7e14', textColor: '#000000' },
        { uid: generateUID(), group: generateUID(), title: 'Understanding the Self', daysOfWeek: [2], startTime: '11:00', endTime: '14:30', color: '#dc3545', textColor: '#ffffff' }
    ];

    function ensureUID(events) {
        return events.map(ev => ({
            ...ev,
            uid: ev.uid || generateUID(),
            group: ev.group || generateUID(),
            exceptionDates: ev.exceptionDates || []
        }));
    }


    if (!localStorage.getItem('calendarEvents')) {
        localStorage.setItem('calendarEvents', JSON.stringify(defaultEvents));
    } else {
        const rawEvents = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
        const sanitized = rawEvents.map(ev => ({
            ...ev,
            uid: ev.uid || generateUID(),
            group: ev.group || generateUID(),
            exceptionDates: ev.exceptionDates || []
        }));
        localStorage.setItem('calendarEvents', JSON.stringify(sanitized));

    }
    function expandRecurring(events, viewStart, viewEnd) {
        const groupedEvents = {};
        const result = [];

        events.forEach(ev => {
            const group = ev.group || generateUID();
            if (!groupedEvents[group]) groupedEvents[group] = [];
            groupedEvents[group].push(ev);
        });

        for (const group in groupedEvents) {
            const groupEvents = groupedEvents[group];
            const exceptionDates = new Set(groupEvents.flatMap(ev => ev.exceptionDates || []).map(d => new Date(d).toDateString()));

            groupEvents.forEach(ev => {
                const daysOfWeek = (ev.daysOfWeek || []).map(Number);

                if (daysOfWeek.length && ev.startTime && ev.endTime) {
                    const recurStart = ev.startRecur ? new Date(ev.startRecur) : new Date('1970-01-01');
                    const recurEnd = ev.endRecur ? new Date(ev.endRecur) : new Date('9999-12-31');

                    const loopStart = new Date(Math.max(viewStart, recurStart));
                    const loopEnd = new Date(Math.min(viewEnd, recurEnd));

                    for (let d = new Date(loopStart); d <= loopEnd; d.setDate(d.getDate() + 1)) {
                        const day = d.getDay();
                        if (daysOfWeek.includes(day) && !exceptionDates.has(d.toDateString())) {
                            const eventDate = new Date(d);
                            const [sh, sm] = ev.startTime.split(':').map(Number);
                            const [eh, em] = ev.endTime.split(':').map(Number);
                            const start = new Date(eventDate);
                            const end = new Date(eventDate);
                            start.setHours(sh, sm);
                            end.setHours(eh, em);
                            result.push({
                                id: ev.uid,
                                title: ev.title,
                                start: start.toISOString(),
                                end: end.toISOString(),
                                color: ev.color,
                                textColor: ev.textColor,
                                allDay: false,
                                extendedProps: {
                                    bgImage: ev.bgImage || null,
                                    group: ev.group,
                                    daysOfWeek: ev.daysOfWeek,
                                    startTime: ev.startTime,
                                    endTime: ev.endTime,
                                    startRecur: ev.startRecur || null,
                                    endRecur: ev.endRecur || null,
                                    exceptionDates: ev.exceptionDates || []
                                }
                            });
                        }
                    }
                } else {
                    result.push({
                        id: ev.uid,
                        title: ev.title,
                        color: ev.color,
                        textColor: ev.textColor,
                        start: ev.start,
                        end: ev.end,
                        allDay: false,
                        extendedProps: {
                            bgImage: ev.bgImage || null,
                            group: ev.group
                        }
                    });
                }
            });
        }

        return result;
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
        events: function (info, successCallback, failureCallback) {
            const stored = ensureUID(getStoredEvents());
            const renderedEvents = expandRecurring(stored, info.start, info.end);
            successCallback(renderedEvents);
        },


        select(info) {
            selectedInfo = info;
            selectedEvent = null;
            openModal('', info.startStr.slice(11, 16), info.endStr.slice(11, 16), [], '#007bff', '#ffffff', '');
        },

        eventClick(info) {
            selectedEvent = info.event;
            selectedInfo = null;

            const eventProps = selectedEvent.extendedProps || {};
            const group = eventProps.group;
            const allEvents = getStoredEvents();
            const groupEvents = allEvents.filter(ev => ev.group === group);
            const days = groupEvents.flatMap(ev => ev.daysOfWeek || []);

            const startTime = eventProps.startTime || selectedEvent.startStr.slice(11, 16);
            const endTime = eventProps.endTime || selectedEvent.endStr.slice(11, 16);
            const bgImage = eventProps.bgImage || '';

            openModal(
                selectedEvent.title,
                startTime,
                endTime,
                days,
                selectedEvent.backgroundColor,
                selectedEvent.textColor,
                bgImage
            );
        },

        eventDidMount(info) {
            const img = info.event.extendedProps?.bgImage;
            const el = info.el;

            if (img) {
                el.style.backgroundImage = `url(${img})`;
                el.style.backgroundColor = info.event.backgroundColor || '#000';
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
                el.style.backgroundRepeat = 'no-repeat';
                el.style.backgroundBlendMode = 'multiply';
                el.style.color = info.event.textColor;
            }

            el.addEventListener('mouseenter', () => {
                // if (!isAltPressed) return;

                const tooltip = document.getElementById('eventTooltip');
                if (!tooltip) return;

                const viewStart = calendar.view.activeStart;
                const viewEnd = calendar.view.activeEnd;

                const allEvents = getStoredEvents().filter(e => {
                    if (e.title !== info.event.title) return false;

                    if (e.startRecur || e.endRecur) {
                        const recurStart = e.startRecur ? new Date(e.startRecur) : null;
                        const recurEnd = e.endRecur ? new Date(e.endRecur) : null;

                        if (recurStart && viewEnd < recurStart) return false;
                        if (recurEnd && viewStart > recurEnd) return false;
                    }

                    return true;
                });

                let totalMins = 0;

                allEvents.forEach(e => {
                    if (e.daysOfWeek && e.startTime && e.endTime) {
                        const [sh, sm] = e.startTime.split(':').map(Number);
                        const [eh, em] = e.endTime.split(':').map(Number);
                        let duration = (eh * 60 + em) - (sh * 60 + sm);
                        if (duration < 0) duration += 1440; // cross-midnight handling
                        totalMins += duration;
                    } else if (e.start && e.end) {
                        const start = new Date(e.start);
                        const end = new Date(e.end);
                        totalMins += (end - start) / (1000 * 60);
                    }
                });

                const thisStart = info.event.start;
                const thisEnd = info.event.end;
                const thisDurationMins = (thisEnd - thisStart) / (1000 * 60);
                const thisDurationHrs = thisDurationMins / 60;

                const totalAwakeMins = 16 * 60 * 7;
                const totalWeekMins = 24 * 60 * 7;

                const percentAwake = ((totalMins / totalAwakeMins) * 100).toFixed(2);
                const percentTotal = ((totalMins / totalWeekMins) * 100).toFixed(2);

                tooltip.innerHTML = `
      <strong>${info.event.title}</strong><br>
      This: ${Math.floor(thisDurationHrs)}h ${Math.round(thisDurationMins % 60)}m<br>
      Total: ${Math.floor(totalMins / 60)}h ${Math.round(totalMins % 60)}m<br>
      ${percentAwake}% of weekly awake time<br>
      ${percentTotal}% of total week
    `;
                tooltip.style.display = 'block';
            });

            el.addEventListener('mouseleave', () => {
                const tooltip = document.getElementById('eventTooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
        },



        eventDrop(info) {
            updateEventGroup(info.event);
        },

        eventResize(info) {
            updateEventGroup(info.event);
        }
    });

    function updateEventGroup(event) {
        const stored = getStoredEvents();
        const group = event.extendedProps?.group;
        const isRecurring = !!event.extendedProps?.daysOfWeek;

        if (isRecurring && group) {
            const newStartTime = formatTime(event.start);
            const newEndTime = formatTime(event.end);
            stored.forEach(ev => {
                if (ev.group === group) {
                    ev.startTime = newStartTime;
                    ev.endTime = newEndTime;
                }
            });
        } else {
            const index = stored.findIndex(ev => ev.uid === event.id);
            if (index !== -1) {
                stored[index].start = event.start.toISOString();
                stored[index].end = event.end ? event.end.toISOString() : null;
                delete stored[index].daysOfWeek;
                delete stored[index].startTime;
                delete stored[index].endTime;
            }
        }

        saveEvents(stored);
        calendar.refetchEvents();

    }

    function formatTime(date) {
        const d = new Date(date);
        return d.toTimeString().slice(0, 5);
    }

    function saveEvents(events) {
        localStorage.setItem('calendarEvents', JSON.stringify(events));
    }

    function getStoredEvents() {
        const stored = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
        return ensureUID(stored);
    }

    function saveModalEvent() {
        const imageInput = document.getElementById('modalBgImage');
        const urlFallback = document.getElementById('modalBgImageUrl').value.trim();

        if (imageInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = function (e) {
                completeSave(e.target.result);
            };
            reader.readAsDataURL(imageInput.files[0]);
        } else {
            completeSave(urlFallback || null);
        }
    }

    function completeSave(imageData) {
        const title = document.getElementById('modalTitle').value;
        const startTime = document.getElementById('modalStartTime').value;
        const endTime = document.getElementById('modalEndTime').value;
        const color = document.getElementById('modalColor').value;
        const textColor = document.getElementById('modalTextColor').value;
        const days = Array.from(document.getElementById('modalDaysOfWeek').selectedOptions).map(o => o.value);
        const startRecur = document.getElementById('modalStartRecur').value || null;
        const endRecur = document.getElementById('modalEndRecur').value || null;
        const exceptionDates = document.getElementById('modalExceptions').value
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);


        let stored = getStoredEvents();

        let groupId = selectedEvent?.extendedProps?.group || generateUID();
        let uid = selectedEvent ? selectedEvent.id : null;
        if (uid) {
            stored = stored.filter(ev => ev.group !== groupId);
        }

        const isCrossMidnight = startTime > endTime;
        const newEvents = [];

        if (selectedInfo && days.length === 0) {
            newEvents.push({
                uid: generateUID(),
                title,
                start: selectedInfo.startStr,
                end: selectedInfo.endStr,
                exceptionDates,
                allDay: false,
                color,
                textColor,
                bgImage: imageData

            });
        } else if (days.length > 0) {
            days.forEach(dow => {
                if (isCrossMidnight) {
                    newEvents.push({
                        uid: generateUID(),
                        group: groupId,
                        title,
                        daysOfWeek: [dow],
                        startTime,
                        endTime: '23:59',
                        exceptionDates,
                        color,
                        textColor,
                        bgImage: imageData,
                        allDay: false,
                        ...(startRecur ? { startRecur } : {}),
                        ...(endRecur ? { endRecur } : {})
                    });
                    const nextDay = (parseInt(dow) + 1) % 7;
                    newEvents.push({
                        uid: generateUID(),
                        group: groupId,
                        title,
                        daysOfWeek: [nextDay.toString()],
                        startTime: '00:00',
                        endTime,
                        exceptionDates,
                        color,
                        textColor,
                        bgImage: imageData,
                        allDay: false,
                        ...(startRecur ? { startRecur } : {}),
                        ...(endRecur ? { endRecur } : {})
                    });
                } else {
                    newEvents.push({
                        uid: generateUID(),
                        group: groupId,
                        title,
                        daysOfWeek: [dow],
                        startTime,
                        endTime,
                        exceptionDates,
                        color,
                        textColor,
                        bgImage: imageData,
                        allDay: false,
                        ...(startRecur ? { startRecur } : {}),
                        ...(endRecur ? { endRecur } : {})
                    });
                }
            });
        } else if (selectedEvent) {
            newEvents.push({
                uid: generateUID(),
                title,
                start: selectedEvent.startStr,
                end: selectedEvent.endStr,
                exceptionDates,
                color,
                textColor,
                bgImage: imageData,
                allDay: false
            });
        }

        saveEvents([...stored, ...newEvents]);
        closeModal();
        calendar.refetchEvents();

    }


    function deleteModalEvent() {
        if (selectedEvent) {
            const stored = getStoredEvents();
            const filtered = stored.filter(ev => ev.group !== selectedEvent.extendedProps?.group);
            saveEvents(filtered);
            calendar.refetchEvents();

        }
        closeModal();
    }

    function duplicateModalEvent() {
        if (!selectedEvent) return;

        const eventProps = selectedEvent.extendedProps || {};
        const days = eventProps.daysOfWeek || [];
        const startTime = eventProps.startTime || selectedEvent.startStr.slice(11, 16);
        const endTime = eventProps.endTime || selectedEvent.endStr.slice(11, 16);
        const startRecur = eventProps.startRecur || null;
        const endRecur = eventProps.endRecur || null;
        const bgImage = eventProps.bgImage || null;
        const exceptionDates = eventProps.exceptionDates || [];


        const newGroup = generateUID();
        const newEvents = [];

        if (days.length > 0) {
            days.forEach(dow => {
                if (startTime > endTime) {
                    newEvents.push({
                        uid: generateUID(), group: newGroup, title: selectedEvent.title,
                        daysOfWeek: [dow], startTime, endTime: '23:59',
                        color: selectedEvent.backgroundColor, textColor: selectedEvent.textColor,
                        bgImage, startRecur, endRecur, exceptionDates
                    });
                    const nextDay = (parseInt(dow) + 1) % 7;
                    newEvents.push({
                        uid: generateUID(), group: newGroup, title: selectedEvent.title,
                        daysOfWeek: [nextDay.toString()], startTime: '00:00', endTime,
                        color: selectedEvent.backgroundColor, textColor: selectedEvent.textColor,
                        bgImage, startRecur, endRecur, exceptionDates
                    });
                } else {
                    newEvents.push({
                        uid: generateUID(), group: newGroup, title: selectedEvent.title,
                        daysOfWeek: [dow], startTime, endTime,
                        color: selectedEvent.backgroundColor, textColor: selectedEvent.textColor,
                        bgImage, startRecur, endRecur, exceptionDates
                    });
                }
            });
        } else {
            newEvents.push({
                uid: generateUID(), title: selectedEvent.title,
                start: selectedEvent.startStr, end: selectedEvent.endStr,
                color: selectedEvent.backgroundColor, textColor: selectedEvent.textColor,
                bgImage, exceptionDates
            });
        }

        const stored = getStoredEvents();
        saveEvents([...stored, ...newEvents]);
        calendar.refetchEvents();

        closeModal();
    }


    function closeModal() {
        document.getElementById('eventModal').style.display = 'none';
        document.getElementById('modalBackdrop').style.display = 'none';
    }

    function openModal(title, startTime, endTime, days, color, textColor, bgImage = '') {
        document.getElementById('modalTitle').value = title;
        document.getElementById('modalStartTime').value = startTime;
        document.getElementById('modalEndTime').value = endTime;

        document.getElementById('modalColor').value = color;
        document.getElementById('modalTextColor').value = textColor;

        const select = document.getElementById('modalDaysOfWeek');
        Array.from(select.options).forEach(opt => {
            opt.selected = days.includes(opt.value) || days.includes(parseInt(opt.value));
        });

        document.getElementById('modalStartRecur').value =
            (selectedEvent?.extendedProps?.startRecur || '');
        document.getElementById('modalEndRecur').value =
            (selectedEvent?.extendedProps?.endRecur || '');
        document.getElementById('modalExceptions').value =
            (selectedEvent?.extendedProps?.exceptionDates || []).join('\n');

        updatePreview();

        document.getElementById('eventModal').style.display = 'block';
        document.getElementById('modalBackdrop').style.display = 'block';
        document.getElementById('modalBgImage').value = '';
        document.getElementById('modalBgImageUrl').value = bgImage || '';
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

    let isAltPressed = false;

    document.addEventListener('keydown', e => {
        if (e.altKey) isAltPressed = true;
    });

    document.addEventListener('keyup', e => {
        if (!e.altKey) isAltPressed = false;
    });

    document.body.addEventListener('mousemove', e => {
        const tooltip = document.getElementById('eventTooltip');
        if (tooltip) {
            tooltip.style.left = `${e.pageX + 15}px`;
            tooltip.style.top = `${e.pageY + 15}px`;
        }
    });


    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('menuDropdown').classList.toggle('hidden');
    });

    document.getElementById('exportBtn').addEventListener('click', function () {
        const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
        const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'calendar-events.json';
        a.click();

        URL.revokeObjectURL(url);
    });


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
                calendar.refetchEvents();

            } catch (err) {
                alert('Invalid JSON file.');
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('saveBtn').addEventListener('click', saveModalEvent);
    document.getElementById('duplicateBtn').addEventListener('click', duplicateModalEvent);
    document.getElementById('deleteBtn').addEventListener('click', deleteModalEvent);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
});
