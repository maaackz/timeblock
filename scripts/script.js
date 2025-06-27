let tagify;
let pieChart, lifetimeChart, timeProgressChart;
let currentEditingTemplate = null;

document.addEventListener('DOMContentLoaded', function () {

    const calendarEl = document.getElementById('calendar');
    const tagInput = document.getElementById("modalTags");
    if (tagInput) {
        tagify = new Tagify(tagInput);
        // tagify.removeAllTags();

    }
    const dashboardTagInput = document.getElementById("dashboardTagFilter");
    const dashboardTagify = new Tagify(dashboardTagInput);
    dashboardTagify.on('change', updateDashboardChart); // update chart when tags change

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

    function getLifeEvents() {
        const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
        const events = [];

        if (settings.birthDate) {
            const birth = new Date(settings.birthDate);
            const birthEnd = new Date(birth);
            birthEnd.setHours(23, 59);

            events.push({
                id: '__life_birth',
                title: '🎂 Birthday',
                start: birth.toISOString(),
                end: birthEnd.toISOString(),
                allDay: false,
                display: 'background',
                backgroundColor: '#ffe699',
                textColor: '#000',
                editable: false,
                tags: ['start'],
                extendedProps: {
                    tags: ['start'],
                    group: '__life',
                    bgImage: null
                }
            });
        }

        if (settings.deathDate) {
            const death = new Date(settings.deathDate);
            const deathEnd = new Date(death);
            deathEnd.setHours(23, 59);

            events.push({
                id: '__life_death',
                title: '💀 Estimated Death',
                start: death.toISOString(),
                end: deathEnd.toISOString(),
                allDay: false,
                display: 'background',
                backgroundColor: '#ffb3b3',
                textColor: '#000',
                editable: false,
                tags: ['end'],
                extendedProps: {
                    tags: ['end'],
                    group: '__life',
                    bgImage: null
                }
            });
        }

        return events;
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
            const exceptionDates = new Set(
                groupEvents.flatMap(ev => ev.exceptionDates || []).map(d => new Date(d).toDateString())
            );

            groupEvents.forEach(ev => {
                const daysOfWeek = (ev.daysOfWeek || []).map(Number);

                if (daysOfWeek.length && ev.startTime && ev.endTime) {
                    const recurStart = ev.startRecur ? new Date(ev.startRecur) : new Date('1970-01-01');
                    const recurEnd = ev.endRecur ? new Date(ev.endRecur) : new Date('9999-12-31');

                    const loopStart = new Date(Math.max(viewStart, recurStart));
                    const loopEnd = new Date(Math.min(viewEnd, recurEnd));

                    for (let d = new Date(loopStart); d <= loopEnd; d = new Date(d.getTime() + 86400000)) {
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
                                    exceptionDates: ev.exceptionDates || [],
                                    tags: ev.tags || []
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
                            group: ev.group,
                            tags: ev.tags || []
                        }
                    });
                }
            });
        }

        return result;
    }

    const calendar = new FullCalendar.Calendar(calendarEl, {
        plugins: [],
        initialView: 'timeGridWeek',
        slotDuration: '00:30:00',
        snapDuration: '00:05:00',
        allDaySlot: false,
        editable: true,
        droppable: true,  // required

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
            right: 'multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay'
        },
        views: {
            multiMonthYear: {
                type: 'multiMonth',
                duration: { years: 1 }
            }
        },
        events: function (info, successCallback, failureCallback) {
            const stored = ensureUID(getStoredEvents());
            const renderedEvents = expandRecurring(stored, info.start, info.end);
            const lifeEvents = getLifeEvents();
            successCallback([...renderedEvents, ...lifeEvents]);
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
            const tags = eventProps.tags || []

            const unlinkBtn = document.getElementById('unlinkBtn');
            if (unlinkBtn) {
                unlinkBtn.style.display = selectedEvent.extendedProps?.daysOfWeek ? 'inline-block' : 'none';
            }

            openModal(
                selectedEvent.title,
                startTime,
                endTime,
                days,
                selectedEvent.backgroundColor,
                selectedEvent.textColor,
                bgImage,
                tags
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
                const tooltip = document.getElementById('eventTooltip');
                if (!tooltip) return;

                const viewDate = calendar.getDate();
                const weekStart = new Date(viewDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                weekStart.setHours(0, 0, 0, 0);

                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 7);

                const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
                const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);

                const yearStart = new Date(viewDate.getFullYear(), 0, 1);
                const yearEnd = new Date(viewDate.getFullYear() + 1, 0, 1);

                const allEvents = getStoredEvents().filter(e => e.title === info.event.title);

                const sumMinsInRange = (startRange, endRange) => {
                    let sum = 0;
                    for (const e of allEvents) {
                        if (e.daysOfWeek && e.startTime && e.endTime && e.startRecur) {
                            const recurStart = new Date(e.startRecur);
                            const recurEnd = e.endRecur ? new Date(e.endRecur) : new Date('9999-12-31');

                            const effectiveStart = new Date(Math.max(recurStart, startRange));
                            const effectiveEnd = new Date(Math.min(recurEnd, endRange));

                            const days = Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24));
                            if (days <= 0) continue;

                            const [sh, sm] = e.startTime.split(':').map(Number);
                            const [eh, em] = e.endTime.split(':').map(Number);
                            let perDay = (eh * 60 + em) - (sh * 60 + sm);
                            if (perDay < 0) perDay += 1440;

                            for (let d = new Date(effectiveStart); d < effectiveEnd; d.setDate(d.getDate() + 1)) {
                                if (e.daysOfWeek.includes(d.getDay().toString())) {
                                    sum += perDay;
                                }
                            }
                        } else if (e.start && e.end) {
                            const eventStart = new Date(e.start);
                            const eventEnd = new Date(e.end);

                            if (eventStart >= endRange || eventEnd <= startRange) continue;

                            const overlapStart = new Date(Math.max(eventStart, startRange));
                            const overlapEnd = new Date(Math.min(eventEnd, endRange));

                            sum += (overlapEnd - overlapStart) / (1000 * 60);
                        }
                    }
                    return sum;
                };

                const minsInWeek = sumMinsInRange(weekStart, weekEnd);
                const minsInMonth = sumMinsInRange(monthStart, monthEnd);
                const minsInYear = sumMinsInRange(yearStart, yearEnd);

                const formatDuration = mins => `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;

                const totalWeekMins = 24 * 60 * 7;
                const totalMonthMins = 24 * 60 * ((monthEnd - monthStart) / (1000 * 60 * 60 * 24));
                const totalYearMins = 24 * 60 * ((yearEnd - yearStart) / (1000 * 60 * 60 * 24));

                const totalAwakeWeek = 16 * 60 * 7;
                const totalAwakeMonth = 16 * 60 * ((monthEnd - monthStart) / (1000 * 60 * 60 * 24));
                const totalAwakeYear = 16 * 60 * ((yearEnd - yearStart) / (1000 * 60 * 60 * 24));

                const percent = (part, whole) => ((part / whole) * 100).toFixed(2);

                const intervals = [];

                for (const e of allEvents) {
                    if (e.daysOfWeek && e.startTime && e.endTime && e.startRecur) {
                        const recurStart = new Date(e.startRecur);
                        const recurEnd = e.endRecur ? new Date(e.endRecur) : new Date('9999-12-31');
                        const [sh, sm] = e.startTime.split(':').map(Number);
                        const [eh, em] = e.endTime.split(':').map(Number);
                        const perDayDur = ((eh * 60 + em) - (sh * 60 + sm) + 1440) % 1440;

                        for (
                            let d = new Date(Math.max(recurStart, yearStart));
                            d <= Math.min(recurEnd, yearEnd);
                            d.setDate(d.getDate() + 1)
                        ) {
                            const dayOfWeek = d.getDay().toString();
                            if (!e.daysOfWeek.includes(dayOfWeek)) continue;
                            const start = new Date(d);
                            start.setHours(sh, sm, 0, 0);
                            const end = new Date(start);
                            end.setMinutes(end.getMinutes() + perDayDur);
                            intervals.push({ start: start.getTime(), end: end.getTime() });
                        }
                    } else if (e.start && e.end) {
                        const start = new Date(e.start).getTime();
                        const end = new Date(e.end).getTime();
                        intervals.push({ start, end });
                    }
                }

                let blocks = [];

                for (const interval of intervals) {
                    if (blocks.length === 0) {
                        blocks.push({ ...interval });
                    } else {
                        const last = blocks[blocks.length - 1];
                        if (interval.start - last.end <= 60 * 1000) {
                            last.end = Math.max(last.end, interval.end);
                        } else {
                            blocks.push({ ...interval });
                        }
                    }
                }

                const totalDur = blocks.reduce((sum, b) => sum + (b.end - b.start) / 60000, 0);
                const count = blocks.length;
                const avgDuration = count > 0 ? totalDur / count : 0;

                // 'This' duration: try to expand to include adjacent intervals within 1min
                // Get ALL stored events with same title
                const storedTitleEvents = getStoredEvents().filter(e => e.title === info.event.title);

                // const intervals = [];

                for (const e of storedTitleEvents) {
                    if (e.daysOfWeek && e.startTime && e.endTime && e.startRecur) {
                        const recurStart = new Date(e.startRecur);
                        const recurEnd = e.endRecur ? new Date(e.endRecur) : new Date('9999-12-31');
                        const [sh, sm] = e.startTime.split(':').map(Number);
                        const [eh, em] = e.endTime.split(':').map(Number);
                        const perDayDur = ((eh * 60 + em) - (sh * 60 + sm) + 1440) % 1440;

                        for (
                            let d = new Date(Math.max(recurStart, yearStart));
                            d <= Math.min(recurEnd, yearEnd);
                            d.setDate(d.getDate() + 1)
                        ) {
                            if (!e.daysOfWeek.includes(d.getDay().toString())) continue;

                            const start = new Date(d);
                            start.setHours(sh, sm, 0, 0);
                            const end = new Date(start);
                            end.setMinutes(end.getMinutes() + perDayDur);
                            intervals.push({ start: start.getTime(), end: end.getTime() });
                        }
                    } else if (e.start && e.end) {
                        const start = new Date(e.start).getTime();
                        const end = new Date(e.end).getTime();
                        intervals.push({ start, end });
                    }
                }

                // Sort and merge
                intervals.sort((a, b) => a.start - b.start);

                const mergedBlocks = [];
                for (const interval of intervals) {
                    if (mergedBlocks.length === 0) {
                        mergedBlocks.push({ ...interval });
                    } else {
                        const last = mergedBlocks[mergedBlocks.length - 1];
                        if (interval.start - last.end <= 60000) {
                            last.end = Math.max(last.end, interval.end);
                        } else {
                            mergedBlocks.push({ ...interval });
                        }
                    }
                }

                // Find which block the hovered event belongs to
                const hoveredStart = info.event.start.getTime();
                const hoveredEnd = info.event.end.getTime();
                let thisDurationMins = (hoveredEnd - hoveredStart) / 60000;

                for (const block of mergedBlocks) {
                    const overlaps = hoveredStart < block.end && hoveredEnd > block.start;
                    const touches = Math.abs(hoveredStart - block.end) <= 60000 || Math.abs(hoveredEnd - block.start) <= 60000;

                    if (overlaps || touches) {
                        thisDurationMins = (block.end - block.start) / 60000;
                        break;
                    }
                }


                tooltip.innerHTML = `
<strong>${info.event.title}</strong><br>
This: ${formatDuration(thisDurationMins)}<br>
Average: ${formatDuration(avgDuration)}<br><br>
<b>Weekly:</b><br>
Total: ${formatDuration(minsInWeek)}<br>
${percent(minsInWeek, totalAwakeWeek)}% of awake time<br>
${percent(minsInWeek, totalWeekMins)}% of total week<br><br>

<b>Monthly:</b><br>
Total: ${formatDuration(minsInMonth)}<br>
${percent(minsInMonth, totalAwakeMonth)}% of awake time<br>
${percent(minsInMonth, totalMonthMins)}% of total month<br><br>

<b>Yearly:</b><br>
Total: ${formatDuration(minsInYear)}<br>
${percent(minsInYear, totalAwakeYear)}% of awake time<br>
${percent(minsInYear, totalYearMins)}% of total year
`;

                tooltip.style.display = 'block';
            });

            el.addEventListener('mouseleave', () => {
                const tooltip = document.getElementById('eventTooltip');
                if (tooltip) tooltip.style.display = 'none';
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
        },






    });

    // Remove this conflicting global handler:
    // calendar.setOption('eventReceive', ...)

    // Replace with this corrected eventReceive handler:
    calendar.on('eventReceive', function (info) {
        console.log('eventReceive triggered', info.event.title, info.event.start);

        if (!info.event.extendedProps.isTemplate) return;

        console.log('Processing template drop for:', info.event.title);

        // Capture ghost event details BEFORE reverting
        const ghostEvent = info.event;
        const start = ghostEvent.start;
        const end = ghostEvent.end; // Get the calculated end time
        const title = ghostEvent.title;
        const backgroundColor = ghostEvent.backgroundColor;
        const textColor = ghostEvent.textColor;
        const extendedProps = ghostEvent.extendedProps;

        // Prevent FullCalendar from creating its own ghost event
        info.revert();

        // Create persistent event using ghost event's calculated duration
        const newEvent = {
            uid: generateUID(),
            title,
            start: start.toISOString(),
            end: end.toISOString(), // Use captured end time
            color: backgroundColor,
            textColor,
            bgImage: extendedProps.bgImage || null,
            tags: extendedProps.tags || [],
            allDay: false
        };

        console.log('Creating persistent event:', newEvent);

        // Add to storage
        const stored = getStoredEvents();
        stored.push(newEvent);
        saveEvents(stored);

        // Refresh calendar
        console.log('Refetching events');
        calendar.refetchEvents();
    });

    function parseDuration(str) {
        const parts = str.split(':').map(Number);
        if (parts.length === 2) {
            const [h, m] = parts;
            return (h * 60 + m) * 60 * 1000;
        }
        return null;
    }

    function setupTemplateDragAndDrop() {
        const sidebar = document.getElementById('templateSidebar');
        new FullCalendar.Draggable(sidebar, {
            itemSelector: '.template-block',
            eventData: function (el) {
                const raw = JSON.parse(el.dataset.event);
                return {
                    title: raw.title,
                    duration: raw.duration,
                    backgroundColor: raw.backgroundColor,
                    textColor: raw.textColor,
                    extendedProps: {
                        tags: raw.tags || [],
                        bgImage: raw.bgImage || null,
                        isTemplate: true
                    }
                };
            }
        });
    }

    function loadTemplateBlocksFromStorage() {
        const stored = JSON.parse(localStorage.getItem('templateBlocks') || '[]');
        const container = document.getElementById('templateSidebar');
        container.innerHTML = ''; // Clear existing templates

        stored.forEach(data => {
            const div = document.createElement('div');
            div.className = 'template-block fc-event';
            div.setAttribute('data-event', JSON.stringify(data));

            // Create content container
            const content = document.createElement('div');
            content.className = 'template-content';
            content.textContent = data.title;
            content.style.backgroundColor = data.backgroundColor;
            content.style.color = data.textColor;

            if (data.bgImage) {
                content.style.backgroundImage = `url(${data.bgImage})`;
                content.style.backgroundSize = 'cover';
                content.style.backgroundBlendMode = 'multiply';
            }

            // Create delete button (x)
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'template-delete-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = 'Delete template';

            // Add click handler for deletion
            deleteBtn.addEventListener('click', function (e) {
                e.stopPropagation(); // Prevent triggering template drag/edit
                div.remove();
                saveTemplateBlocksToStorage();
            });

            // Add click handler for editing to the CONTENT area
            content.addEventListener('click', function (e) {
                editTemplateBlock(div);
            });

            // Build template structure
            div.appendChild(content);
            div.appendChild(deleteBtn);
            container.appendChild(div);
        });

        setupTemplateDragAndDrop();
    }

    loadTemplateBlocksFromStorage()
    function saveTemplateBlock(data) {
        const container = document.getElementById('templateSidebar');
        const div = document.createElement('div');
        div.className = 'template-block fc-event';
        div.setAttribute('data-event', JSON.stringify(data));

        // Create content container
        const content = document.createElement('div');
        content.className = 'template-content';
        content.textContent = data.title;
        content.style.backgroundColor = data.backgroundColor;
        content.style.color = data.textColor;

        if (data.bgImage) {
            content.style.backgroundImage = `url(${data.bgImage})`;
            content.style.backgroundSize = 'cover';
            content.style.backgroundBlendMode = 'multiply';
        }

        // Create delete button (x)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'template-delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Delete template';

        // Add click handler for deletion
        deleteBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            div.remove();
            saveTemplateBlocksToStorage();
        });

        // Add click handler for editing to the CONTENT area
        content.addEventListener('click', function (e) {
            editTemplateBlock(div);
        });

        // Build template structure
        div.appendChild(content);
        div.appendChild(deleteBtn);
        container.appendChild(div);

        saveTemplateBlocksToStorage();
    }

    function saveTemplateBlocksToStorage() {
        const templates = [];
        document.querySelectorAll('#templateSidebar .template-block').forEach(el => {
            const data = el.getAttribute('data-event');
            if (data) templates.push(JSON.parse(data));
        });
        localStorage.setItem('templateBlocks', JSON.stringify(templates));
    }

    function editTemplateBlock(element) {
        currentEditingTemplate = element;
        const data = JSON.parse(element.getAttribute('data-event'));

        // Calculate end time from duration
        const [hours, minutes] = data.duration.split(':');
        const startTime = "00:00";
        const endTime = `${hours.padStart(2, '0')}:${minutes}`;

        // // Show template-specific UI
        // document.getElementById('deleteTemplateBtn').style.display = 'inline-block';
        // document.querySelector('label[for="modalDaysOfWeek"]').style.display = 'none';
        // document.getElementById('modalDaysOfWeek').style.display = 'none';
        // document.querySelector('label[for="modalExceptions"]').style.display = 'none';
        // document.getElementById('modalExceptions').style.display = 'none';
        // document.querySelector('label[for="modalStartRecur"]').style.display = 'none';
        // document.getElementById('modalStartRecur').style.display = 'none';
        // document.querySelector('label[for="modalEndRecur"]').style.display = 'none';
        // document.getElementById('modalEndRecur').style.display = 'none';

        openModal(
            data.title,
            startTime,
            endTime,
            [],
            data.backgroundColor,
            data.textColor,
            data.bgImage || '',
            data.tags || []
        );
    }

    function deleteTemplate() {
        if (currentEditingTemplate) {
            currentEditingTemplate.remove();
            saveTemplateBlocksToStorage();
            closeModal();
        }
    }

    calendar.on('eventDragStop', function (info) {
        const sidebar = document.getElementById('templateSidebar');
        const sidebarRect = sidebar.getBoundingClientRect();
        const { pageX, pageY } = info.jsEvent;

        if (
            pageX >= sidebarRect.left &&
            pageX <= sidebarRect.right &&
            pageY >= sidebarRect.top &&
            pageY <= sidebarRect.bottom
        ) {
            // Convert dragged event to template
            const templateData = {
                title: info.event.title,
                duration: getEventDuration(info.event),
                tags: info.event.extendedProps?.tags || [],
                bgImage: info.event.extendedProps?.bgImage || null,
                backgroundColor: info.event.backgroundColor,
                textColor: info.event.textColor
            };

            saveTemplateBlock(templateData);
            // info.event.remove(); // ❌ remove this line to keep original event
        }
    });

    calendar.on('eventsSet', function (info) {
        console.log('Events after refetch:');
        calendar.getEvents().forEach(event => {
            console.log(`- ${event.title} (${event.id}) at ${event.start}`);
        });
    });

    function getEventDuration(event) {
        const diff = (event.end - event.start) / 60000;
        const h = Math.floor(diff / 60).toString().padStart(2, '0');
        const m = Math.round(diff % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    }

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

        // Handle template saving
        if (currentEditingTemplate) {
            // Process image first
            const processImage = (imageData) => {
                const title = document.getElementById('modalTitle').value;
                const startTime = document.getElementById('modalStartTime').value;
                const endTime = document.getElementById('modalEndTime').value;
                const color = document.getElementById('modalColor').value;
                const textColor = document.getElementById('modalTextColor').value;
                const tags = tagify ? tagify.value.map(tag => tag.value) : [];

                // Calculate duration
                const [startH, startM] = startTime.split(':').map(Number);
                const [endH, endM] = endTime.split(':').map(Number);
                let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                if (totalMinutes < 0) totalMinutes += 24 * 60;

                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                const duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

                const newData = {
                    title,
                    duration,
                    tags,
                    bgImage: imageData,
                    backgroundColor: color,
                    textColor: textColor
                };

                // Remove old template before creating new one
                currentEditingTemplate.remove();

                // Create updated template
                saveTemplateBlock(newData);
                closeModal();
            };

            // Handle image loading
            if (imageInput.files.length > 0) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    processImage(e.target.result);
                };
                reader.readAsDataURL(imageInput.files[0]);
            } else {
                processImage(urlFallback || null);
            }
            return;
        }

        // Handle event saving (original code)
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
        const tags = tagify ? tagify.value.map(tag => tag.value) : [];


        let stored = getStoredEvents();

        // Remove original event(s) if editing an existing event
        if (selectedEvent) {
            const eventProps = selectedEvent.extendedProps || {};

            // Remove recurring events by group
            if (eventProps.daysOfWeek) {
                stored = stored.filter(ev => ev.group !== eventProps.group);
            }
            // Remove single event by UID
            else {
                stored = stored.filter(ev => ev.uid !== selectedEvent.id);
            }
        }

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
                bgImage: imageData,
                tags: tags

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
                        tags: tags,
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
                        tags: tags,
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
                        tags: tags,
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
                tags: tags,
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
        const tags = eventProps.tags || []

        const newGroup = generateUID();
        const newEvents = [];

        if (days.length > 0) {
            days.forEach(dow => {
                if (startTime > endTime) {
                    newEvents.push({
                        uid: generateUID(), group: newGroup, title: selectedEvent.title,
                        daysOfWeek: [dow], startTime, endTime: '23:59',
                        color: selectedEvent.backgroundColor, textColor: selectedEvent.textColor,
                        bgImage, tags: tags, startRecur, endRecur, exceptionDates
                    });
                    const nextDay = (parseInt(dow) + 1) % 7;
                    newEvents.push({
                        uid: generateUID(), group: newGroup, title: selectedEvent.title,
                        daysOfWeek: [nextDay.toString()], startTime: '00:00', endTime,
                        color: selectedEvent.backgroundColor, textColor: selectedEvent.textColor,
                        bgImage, tags: tags, startRecur, endRecur, exceptionDates
                    });
                } else {
                    newEvents.push({
                        uid: generateUID(), group: newGroup, title: selectedEvent.title,
                        daysOfWeek: [dow], startTime, endTime,
                        color: selectedEvent.backgroundColor, textColor: selectedEvent.textColor,
                        bgImage, tags: tags, startRecur, endRecur, exceptionDates
                    });
                }
            });
        } else {
            newEvents.push({
                uid: generateUID(), title: selectedEvent.title,
                start: selectedEvent.startStr, end: selectedEvent.endStr,
                color: selectedEvent.backgroundColor, textColor: selectedEvent.textColor,
                bgImage, tags: tags, exceptionDates
            });
        }

        const stored = getStoredEvents();
        saveEvents([...stored, ...newEvents]);
        calendar.refetchEvents();

        closeModal();
    }


    function closeModal() {
        const eventModal = document.getElementById('eventModal');
        const modalBackdrop = document.getElementById('modalBackdrop');

        if (eventModal) eventModal.style.display = 'none';
        if (modalBackdrop) modalBackdrop.style.display = 'none';

        // Reset template editing state
        currentEditingTemplate = null;
        // document.getElementById('deleteTemplateBtn').style.display = 'none';
        // document.querySelector('label[for="modalDaysOfWeek"]').style.display = 'block';
        // document.getElementById('modalDaysOfWeek').style.display = 'block';
        // document.querySelector('label[for="modalExceptions"]').style.display = 'block';
        // document.getElementById('modalExceptions').style.display = 'block';
    }

    function openModal(title, startTime, endTime, days, color, textColor, bgImage = '', tags = []) {
        const eventModal = document.getElementById('eventModal');
        if (!eventModal) return;
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

        // ✅ Restore previously saved tags
        const existingTags = selectedEvent?.extendedProps?.tags || tags || [];
        if (tagify) {
            tagify.removeAllTags();
            tagify.addTags(existingTags);
        }

        updatePreview();

        document.getElementById('eventModal').style.display = 'block';
        document.getElementById('modalBackdrop').style.display = 'block';
        document.getElementById('modalBgImage').value = '';
        document.getElementById('modalBgImageUrl').value = bgImage || '';

        eventModal.style.display = 'block';

        const modalBackdrop = document.getElementById('modalBackdrop');
        if (modalBackdrop) modalBackdrop.style.display = 'block';
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
    document.getElementById('unlinkBtn').addEventListener('click', unlinkSingleEvent);
    document.getElementById('deleteBtn').addEventListener('click', deleteModalEvent);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);

    let dashboardVisible = false;

    const toggleBtn = document.getElementById('toggleDashboardBtn');
    const dashboardView = document.getElementById('dashboardView');
    let pieChart; // Chart.js instance

    // toggleBtn.addEventListener('click', () => {
    //     dashboardVisible = !dashboardVisible;
    //     dashboardView.style.display = dashboardVisible ? 'block' : 'none';

    //     if (dashboardVisible) renderDashboard();
    // });

    document.getElementById('toggleDashboardBtn').addEventListener('click', () => {
        const view = document.getElementById('dashboardView');
        view.style.display = view.style.display === 'none' ? 'block' : 'none';

        updateDashboardChart();
        estimateLifetimeUsageChart();
        renderCustomTimeProgressBar(); // <-- new progress bar chart
    });


    // function renderDashboard() {
    //     const events = calendar.getEvents(); // FullCalendar instance must be initialized already
    //     const totals = {};

    //     events.forEach(event => {
    //         const title = event.title || "Untitled";
    //         const start = event.start;
    //         const end = event.end;

    //         if (start && end) {
    //             const durationHours = (end - start) / 1000 / 60 / 60;
    //             if (!totals[title]) totals[title] = 0;
    //             totals[title] += durationHours;
    //         }
    //     });

    //     const labels = Object.keys(totals);
    //     const data = Object.values(totals);

    //     // Destroy existing chart to avoid duplicates
    //     if (pieChart) pieChart.destroy();

    //     const ctx = document.getElementById('activityPieChart').getContext('2d');
    //     pieChart = new Chart(ctx, {
    //         type: 'pie',
    //         data: {
    //             labels,
    //             datasets: [{
    //                 label: 'Total Time Spent (hrs)',
    //                 data,
    //                 backgroundColor: labels.map((_, i) =>
    //                     `hsl(${(i * 360 / labels.length)}, 70%, 60%)`
    //                 )
    //             }]
    //         },
    //         options: {
    //             plugins: {
    //                 legend: { position: 'right' }
    //             }
    //         }
    //     });
    // }

    function updateDashboardChart() {

        const storedEvents = getStoredEvents();
        const selectedTags = dashboardTagify.value.map(tag => tag.value);

        const filteredEvents = storedEvents.filter(ev => {
            if (selectedTags.length === 0) return true;
            if (!Array.isArray(ev.tags)) return false;
            return selectedTags.every(tag => ev.tags.includes(tag));
        });

        const titleDurations = {};
        filteredEvents.forEach(ev => {
            let duration = 0;

            if (ev.startTime && ev.endTime) {
                const [sh, sm] = ev.startTime.split(':').map(Number);
                const [eh, em] = ev.endTime.split(':').map(Number);
                duration = (eh * 60 + em) - (sh * 60 + sm);
                if (duration < 0) duration += 1440;
            } else if (ev.start && ev.end) {
                duration = (new Date(ev.end) - new Date(ev.start)) / (1000 * 60);
            }

            titleDurations[ev.title] = (titleDurations[ev.title] || 0) + duration;
        });

        const labels = Object.keys(titleDurations);
        const data = labels.map(title => titleDurations[title]);
        const total = data.reduce((a, b) => a + b, 0);

        if (window.pieChart) window.pieChart.destroy();

        const ctx = document.getElementById('activityPieChart').getContext('2d');
        window.pieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: labels.map(() => `hsl(${Math.random() * 360}, 70%, 60%)`)
                }]
            },
            options: {
                plugins: {
                    datalabels: {
                        color: '#fff',
                        formatter: (value, context) => {
                            const percent = ((value / total) * 100).toFixed(1);
                            return `${percent}%`;
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                const label = ctx.label || '';
                                const value = ctx.parsed;
                                const percent = ((value / total) * 100).toFixed(1);
                                return `${label}: ${Math.round(value)} mins (${percent}%)`;
                            }
                        }
                    },
                    legend: {
                        labels: {
                            color: '#000'
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });

        estimateLifetimeUsageChart();
    }

    function loadSettings() {
        const panel = document.getElementById('settingsPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';

        // Load stored values
        const stored = JSON.parse(localStorage.getItem('userSettings') || '{}');
        if (stored.birthDate) document.getElementById('birthDate').value = stored.birthDate;
        if (stored.lifespanYears) document.getElementById('lifespanYears').value = stored.lifespanYears;
        if (stored.deathDate) document.getElementById('deathDate').value = stored.deathDate;
    }
    // Toggle settings panel
    document.getElementById('openSettingsBtn').addEventListener('click', () => {
        loadSettings()
    });

    loadSettings()
    updateDashboardChart()
    // Auto-calculate death date from birth + lifespan
    function updateDeathDate() {
        const birthInput = document.getElementById('birthDate');
        const lifespanInput = document.getElementById('lifespanYears');
        const deathInput = document.getElementById('deathDate');

        const birth = new Date(birthInput.value);
        const lifespan = parseFloat(lifespanInput.value);

        if (!isNaN(birth.getTime()) && lifespan > 0) {
            const death = new Date(birth);
            const fullYears = Math.floor(lifespan);
            const extraDays = (lifespan - fullYears) * 365.25;

            death.setFullYear(death.getFullYear() + fullYears);
            death.setDate(death.getDate() + Math.round(extraDays));

            // Format to datetime-local string
            const localDate = death.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
            deathInput.value = localDate;
        }
    }

    // Hook listeners
    document.getElementById('birthDate').addEventListener('input', updateDeathDate);
    document.getElementById('lifespanYears').addEventListener('input', updateDeathDate);

    // Save settings
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        const birthDate = document.getElementById('birthDate').value;
        const lifespanYears = parseFloat(document.getElementById('lifespanYears').value || '0');
        const deathDate = document.getElementById('deathDate').value;

        localStorage.setItem('userSettings', JSON.stringify({
            birthDate,
            lifespanYears,
            deathDate
        }));

        alert('Settings saved!');
    });


    function calculateTagTotals(events, rangeStart, rangeEnd) {
        const tagTotals = {};

        const getDurationMins = (start, end) => (end - start) / (1000 * 60);

        for (const e of events) {
            const tags = (e.tags || '').split(',').map(t => t.trim()).filter(Boolean);
            if (tags.length === 0) continue;

            if (e.daysOfWeek && e.startTime && e.endTime && e.startRecur) {
                const recurStart = new Date(e.startRecur);
                const recurEnd = e.endRecur ? new Date(e.endRecur) : new Date('9999-12-31');

                const effectiveStart = new Date(Math.max(recurStart, rangeStart));
                const effectiveEnd = new Date(Math.min(recurEnd, rangeEnd));
                const days = Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24));
                if (days <= 0) continue;

                const [sh, sm] = e.startTime.split(':').map(Number);
                const [eh, em] = e.endTime.split(':').map(Number);
                let perDay = (eh * 60 + em) - (sh * 60 + sm);
                if (perDay < 0) perDay += 1440;

                for (let d = new Date(effectiveStart); d < effectiveEnd; d.setDate(d.getDate() + 1)) {
                    if (e.daysOfWeek.includes(d.getDay().toString())) {
                        for (const tag of tags) {
                            tagTotals[tag] = (tagTotals[tag] || 0) + perDay;
                        }
                    }
                }

            } else if (e.start && e.end) {
                const start = new Date(e.start);
                const end = new Date(e.end);
                if (start >= rangeEnd || end <= rangeStart) continue;

                const overlapStart = new Date(Math.max(start, rangeStart));
                const overlapEnd = new Date(Math.min(end, rangeEnd));
                const duration = getDurationMins(overlapStart, overlapEnd);

                for (const tag of tags) {
                    tagTotals[tag] = (tagTotals[tag] || 0) + duration;
                }
            }
        }

        return tagTotals;
    }


    function getUserSettings() {
        return JSON.parse(localStorage.getItem('userSettings') || '{}');
    }

    function estimateLifetimeUsageChart() {
        const events = getStoredEvents();
        const settings = getUserSettings();
        const birth = new Date(settings.birthDate);
        const death = new Date(settings.deathDate);
        const now = new Date();

        if (!birth || !death || isNaN(birth.getTime()) || isNaN(death.getTime())) {
            console.warn("Birth or death date invalid");
            return;
        }

        const totalLifeMins = (death - birth) / (1000 * 60);
        const awakeLifeMins = totalLifeMins * (16 / 24);
        const lifeElapsedMins = (now - birth) / (1000 * 60);

        // --- Calculate total minutes spent so far from events ---
        let totalUsedMins = 0;
        events.forEach(e => {
            if (e.startTime && e.endTime && e.daysOfWeek && e.startRecur) {
                const recurStart = new Date(e.startRecur);
                const recurEnd = e.endRecur ? new Date(e.endRecur) : now;
                const [sh, sm] = e.startTime.split(':').map(Number);
                const [eh, em] = e.endTime.split(':').map(Number);
                let perDay = (eh * 60 + em) - (sh * 60 + sm);
                if (perDay < 0) perDay += 1440;

                for (let d = new Date(recurStart); d <= recurEnd; d.setDate(d.getDate() + 1)) {
                    if (d > now) break;
                    if (e.daysOfWeek.includes(d.getDay().toString())) {
                        totalUsedMins += perDay;
                    }
                }
            } else if (e.start && e.end) {
                const start = new Date(e.start);
                const end = new Date(e.end);
                if (end > now) return;
                totalUsedMins += (end - start) / (1000 * 60);
            }
        });

        // --- Estimate future usage ---
        const daysLived = (now - birth) / (1000 * 60 * 60 * 24);
        const avgPerDayMins = totalUsedMins / daysLived;
        const estimatedRemainingUsageMins = avgPerDayMins * ((death - now) / (1000 * 60 * 60 * 24));

        const estimatedTotalUsageMins = totalUsedMins + estimatedRemainingUsageMins;

        const ctx = document.getElementById('lifetimeChart').getContext('2d');
        if (window.lifeChart) window.lifeChart.destroy();

        window.lifeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Used', 'Estimated Total Use', 'Awake Life'],
                datasets: [{
                    label: 'Time over Lifespan',
                    data: [totalUsedMins, estimatedTotalUsageMins, awakeLifeMins],
                    backgroundColor: ['#f66', '#fc3', '#6cf']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const val = ctx.parsed.y;
                                const label = ctx.chart.data.labels[ctx.dataIndex];
                                return `${label}:\n${formatTimeUnits(val)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Minutes'
                        },
                        beginAtZero: true,
                        max: totalLifeMins
                    }
                }
            }
        });
    }


    function formatTimeUnits(minutes) {
        const mins = minutes;
        const hrs = minutes / 60;
        const days = hrs / 24;
        const weeks = days / 7;
        const months = days / 30.4375; // average month
        const years = days / 365.25;

        return `
${mins.toFixed(0)} mins
${hrs.toFixed(1)} hrs
${days.toFixed(1)} days
${weeks.toFixed(1)} wks
${months.toFixed(1)} mos
${years.toFixed(2)} yrs
`.trim();
    }

    function renderCustomTimeProgressBar() {
        const settings = getUserSettings();
        const birth = new Date(settings.birthDate);
        const death = new Date(settings.deathDate);
        const now = new Date();

        if (!birth || !death || isNaN(birth.getTime()) || isNaN(death.getTime())) return;

        const totalMins = (death - birth) / (1000 * 60);
        const passedMins = (now - birth) / (1000 * 60);
        const remainingMins = totalMins - passedMins;

        const awakePassed = passedMins * (16 / 24);
        const asleepPassed = passedMins * (8 / 24);
        const awakeRemaining = remainingMins * (16 / 24);
        const asleepRemaining = remainingMins * (8 / 24);

        const spentPercent = (passedMins / totalMins) * 100;
        const remainingPercent = 100 - spentPercent;

        document.getElementById('mainSpent').style.width = `${spentPercent}%`;
        document.getElementById('mainRemaining').style.width = `${remainingPercent}%`;

        const awakeSpentPercent = (awakePassed / passedMins) * 100;
        const asleepSpentPercent = 100 - awakeSpentPercent;
        const awakeRemainingPercent = (awakeRemaining / remainingMins) * 100;
        const asleepRemainingPercent = 100 - awakeRemainingPercent;

        document.getElementById('subSpent').style.width = `${spentPercent}%`;
        document.getElementById('subRemaining').style.width = `${remainingPercent}%`;
        document.getElementById('awakeSpent').style.width = `${awakeSpentPercent}%`;
        document.getElementById('asleepSpent').style.width = `${asleepSpentPercent}%`;
        document.getElementById('awakeRemaining').style.width = `${awakeRemainingPercent}%`;
        document.getElementById('asleepRemaining').style.width = `${asleepRemainingPercent}%`;

        let floatingTooltip = document.querySelector('.custom-tooltip');
        if (!floatingTooltip) {
            floatingTooltip = document.createElement('div');
            floatingTooltip.className = 'custom-tooltip';
            document.body.appendChild(floatingTooltip);
        }

        const format = (val) =>
            formatTimeUnits(val)
                .split('\n')
                .map(line => line.replace(/^([\d,.]+)/, (_, num) => Number(num.replace(/,/g, '')).toLocaleString()))
                .join('<br>');

        const setTooltip = (id, label, val, percent = null) => {
            const el = document.getElementById(id);
            if (!el) return;

            let percentLine = percent !== null ? `<br><em>${percent.toFixed(1)}%</em>` : '';
            const html = `<strong>${label}</strong><br>${format(val)}${percentLine}`;

            el.addEventListener('mouseenter', () => {
                floatingTooltip.innerHTML = html;
                floatingTooltip.style.display = 'block';
            });

            el.addEventListener('mouseleave', () => {
                floatingTooltip.style.display = 'none';
            });
        };


        document.body.addEventListener('mousemove', e => {
            if (floatingTooltip) {
                floatingTooltip.style.left = `${e.pageX + 15}px`;
                floatingTooltip.style.top = `${e.pageY + 15}px`;
            }
        });

        setTooltip('mainSpent', 'Spent', passedMins, spentPercent);
        setTooltip('mainRemaining', 'Remaining', remainingMins, remainingPercent);
        setTooltip('awakeSpent', 'Spent (Awake)', awakePassed, awakeSpentPercent);
        setTooltip('asleepSpent', 'Spent (Asleep)', asleepPassed, asleepSpentPercent);
        setTooltip('awakeRemaining', 'Remaining (Awake)', awakeRemaining, awakeRemainingPercent);
        setTooltip('asleepRemaining', 'Remaining (Asleep)', asleepRemaining, asleepRemainingPercent);


        // === MINI BARS SETUP ===

        const hour = now.getHours() + now.getMinutes() / 60;
        const getMinsLeft = days => days * 24 * 60;

        const minsLeftToday = getMinsLeft(1 - hour / 24);
        const minsLeftWeek = getMinsLeft(7 - now.getDay() - hour / 24);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const minsLeftMonth = getMinsLeft(daysInMonth - now.getDate() - hour / 24);
        const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
        const minsLeftYear = (endOfYear - now) / (1000 * 60);

        const setupMiniBar = (prefix, totalMins, minsLeftAwake, minsLeftAsleep) => {
            const minsSpentAwake = (totalMins * (16 / 24)) - minsLeftAwake;
            const minsSpentAsleep = (totalMins * (8 / 24)) - minsLeftAsleep;

            const awakeSpentPct = (minsSpentAwake / totalMins) * 100;
            const asleepSpentPct = (minsSpentAsleep / totalMins) * 100;
            const awakeRemainingPct = (minsLeftAwake / totalMins) * 100;
            const asleepRemainingPct = (minsLeftAsleep / totalMins) * 100;

            // Main bar (spent vs remaining)
            const spentPct = (minsSpentAwake + minsSpentAsleep) / totalMins * 100;
            const remainingPct = 100 - spentPct;
            document.getElementById(`${prefix}Spent`).style.width = `${spentPct}%`;
            document.getElementById(`${prefix}Remaining`).style.width = `${remainingPct}%`;

            // Awake/Asleep inner segments
            document.getElementById(`${prefix}AwakeSpent`).style.width = `${awakeSpentPct}%`;
            document.getElementById(`${prefix}AsleepSpent`).style.width = `${asleepSpentPct}%`;
            document.getElementById(`${prefix}AwakeRemaining`).style.width = `${awakeRemainingPct}%`;
            document.getElementById(`${prefix}AsleepRemaining`).style.width = `${asleepRemainingPct}%`;

            const capitalizedPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);

            setTooltip(`${prefix}Spent`, `Spent`, minsSpentAwake + minsSpentAsleep, spentPct);
            setTooltip(`${prefix}Remaining`, `Remaining`, minsLeftAwake + minsLeftAsleep, remainingPct);
            setTooltip(`${prefix}AwakeSpent`, `Spent (Awake)`, minsSpentAwake, awakeSpentPct);
            setTooltip(`${prefix}AsleepSpent`, `Spent (Asleep)`, minsSpentAsleep, asleepSpentPct);
            setTooltip(`${prefix}AwakeRemaining`, `Remaining (Awake)`, minsLeftAwake, awakeRemainingPct);
            setTooltip(`${prefix}AsleepRemaining`, `Remaining (Asleep)`, minsLeftAsleep, asleepRemainingPct);


        };


        setupMiniBar('day', 1440, minsLeftToday * (16 / 24), minsLeftToday * (8 / 24));
        setupMiniBar('week', 10080, minsLeftWeek * (16 / 24), minsLeftWeek * (8 / 24));
        setupMiniBar('month', daysInMonth * 24 * 60, minsLeftMonth * (16 / 24), minsLeftMonth * (8 / 24));
        setupMiniBar('year', 365.25 * 24 * 60, minsLeftYear * (16 / 24), minsLeftYear * (8 / 24));

    }

    renderCustomTimeProgressBar()

    calendar.on('datesSet', () => {
        document.querySelectorAll('.fc-day').forEach(cell => {
            cell.style.cursor = 'pointer'; // visual cue
            cell.addEventListener('click', (e) => {
                // print("test")
                const dateStr = cell.getAttribute('data-date');
                if (dateStr) {
                    showDayMenu(new Date(dateStr), e.pageX, e.pageY);
                }
            });
        });
    });
    function showDayMenu(date, x, y) {
        const menu = document.getElementById('dayActionMenu');
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.display = 'block';
        menu.setAttribute('data-date', date.toISOString());
    }

    // Hide menu on click elsewhere
    // document.addEventListener('click', (e) => {
    //     if (!e.target.closest('#dayActionMenu') && document.getElementById('dayActionMenu').style.display !=) {
    //         document.getElementById('dayActionMenu').style.display = 'none';
    //     }
    // });

    document.querySelectorAll('#dayActionMenu .menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.getAttribute('data-action');
            const menu = document.getElementById('dayActionMenu');
            const date = new Date(menu.getAttribute('data-date'));

            if (action === 'unlinkAll') {
                unlinkEventsOnDate(date);
            }

            menu.style.display = 'none';
        });
    });


    function unlinkEventsOnDate(targetDate) {
        const targetDateStr = targetDate.toISOString().split('T')[0];
        const stored = getStoredEvents();
        const rendered = calendar.getEvents();
        const eventsToUnlink = rendered.filter(ev =>
            ev.start && ev.start.toDateString() === targetDate.toDateString()
        );

        const newUnlinkedEvents = [];

        // Add skip date to all members of affected groups
        const groupsToUpdate = new Set(eventsToUnlink.map(ev => ev.extendedProps?.group).filter(Boolean));

        for (const groupId of groupsToUpdate) {
            for (const ev of stored) {
                if (ev.group === groupId) {
                    ev.exceptionDates = ev.exceptionDates || [];
                    if (!ev.exceptionDates.includes(targetDateStr)) {
                        ev.exceptionDates.push(targetDateStr);
                    }
                }
            }
        }

        // Create new unlinked events to be saved
        for (const original of eventsToUnlink) {
            const start = original.start.toISOString();
            const end = original.end?.toISOString();

            newUnlinkedEvents.push({
                uid: generateUID(),
                title: original.title,
                start,
                end,
                allDay: original.allDay,
                color: original.backgroundColor,
                textColor: original.textColor,
                bgImage: original.extendedProps?.bgImage || null,
                tags: original.extendedProps?.tags || [],
                exceptionDates: [],
            });
        }

        saveEvents([...stored, ...newUnlinkedEvents]);
        calendar.refetchEvents();
    }

    function unlinkSingleEvent() {
        if (!selectedEvent || !selectedEvent.start) return;

        const d = selectedEvent.start;
        const eventDateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

        const stored = getStoredEvents();
        const groupId = selectedEvent.extendedProps?.group;

        if (groupId) {
            for (const ev of stored) {
                if (ev.group === groupId) {
                    ev.exceptionDates = ev.exceptionDates || [];
                    if (!ev.exceptionDates.includes(eventDateStr)) {
                        ev.exceptionDates.push(eventDateStr);
                    }
                }
            }
        }

        const newEvent = {
            uid: generateUID(),
            title: selectedEvent.title,
            start: selectedEvent.start.toISOString(),
            end: selectedEvent.end?.toISOString(),
            allDay: selectedEvent.allDay,
            color: selectedEvent.backgroundColor,
            textColor: selectedEvent.textColor,
            bgImage: selectedEvent.extendedProps?.bgImage || null,
            tags: selectedEvent.extendedProps?.tags || [],
            exceptionDates: [],
        };

        saveEvents([...stored, newEvent]);

        // 💥 Clear and re-add event source to avoid stale reference issues
        calendar.removeAllEventSources();
        calendar.addEventSource(function (info, successCallback, failureCallback) {
            const raw = getStoredEvents();
            const expanded = expandRecurring(raw, info.start, info.end);
            successCallback(expanded);
        });

        calendar.refetchEvents();
        closeModal();
    }




});
