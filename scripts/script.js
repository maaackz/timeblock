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

  if (!localStorage.getItem('calendarEvents')) {
    localStorage.setItem('calendarEvents', JSON.stringify(defaultEvents));
  }

  function expandRecurring(events) {
    return events.map(ev => {
      const base = {
        title: ev.title,
        color: ev.color,
        textColor: ev.textColor,
        allDay: false,
        extendedProps: {
          bgImage: ev.bgImage || null
        }
      };
      if (ev.daysOfWeek && ev.startTime && ev.endTime) {
        return {
          ...base,
          daysOfWeek: ev.daysOfWeek,
          startTime: ev.startTime,
          endTime: ev.endTime,
          display: 'block',
          extendedProps: {
            ...base.extendedProps,
            daysOfWeek: ev.daysOfWeek,
            startTime: ev.startTime,
            endTime: ev.endTime
          }
        };
      } else {
        return {
          ...base,
          start: ev.start,
          end: ev.end
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
      openModal('', info.startStr.slice(11, 16), info.endStr.slice(11, 16), [], '#007bff', '#ffffff', '');
    },

    eventClick(info) {
        selectedEvent = info.event;
        selectedInfo = null;

        const eventProps = selectedEvent.extendedProps || {};
        const days = eventProps.daysOfWeek || [];

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
        if (img) {
            info.el.style.backgroundImage = `url(${img})`;
            info.el.style.backgroundColor = info.event.backgroundColor || '#000'; // fallback color
            info.el.style.backgroundSize = 'cover';
            info.el.style.backgroundPosition = 'center';
            info.el.style.backgroundRepeat = 'no-repeat';
            info.el.style.backgroundBlendMode = 'multiply'; // or try 'overlay', 'soft-light', etc.
            info.el.style.color = info.event.textColor;
        }
    }

  });

  function saveEvents(events) {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
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

    updatePreview();

    document.getElementById('eventModal').style.display = 'block';
    document.getElementById('modalBackdrop').style.display = 'block';
    document.getElementById('modalBgImage').value = ''; // reset file input
    document.getElementById('modalBgImageUrl').value = bgImage || '';
    }


  function closeModal() {
    document.getElementById('eventModal').style.display = 'none';
    document.getElementById('modalBackdrop').style.display = 'none';
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
    const stored = JSON.parse(localStorage.getItem('calendarEvents') || '[]');

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

    if (selectedInfo && days.length === 0) {
      stored.push({
        title,
        start: selectedInfo.startStr,
        end: selectedInfo.endStr,
        allDay: false,
        color,
        textColor,
        bgImage: imageData
      });
    } else if (days.length > 0) {
      days.forEach(dow => {
        if (isCrossMidnight) {
          stored.push({
            title,
            daysOfWeek: [dow],
            startTime,
            endTime: '23:59',
            color,
            textColor,
            bgImage: imageData,
            allDay: false
          });
          const nextDay = (parseInt(dow) + 1) % 7;
          stored.push({
            title,
            daysOfWeek: [nextDay.toString()],
            startTime: '00:00',
            endTime,
            color,
            textColor,
            bgImage: imageData,
            allDay: false
          });
        } else {
          stored.push({
            title,
            daysOfWeek: [dow],
            startTime,
            endTime,
            color,
            textColor,
            bgImage: imageData,
            allDay: false
          });
        }
      });
    } else if (selectedEvent) {
      stored.push({
        title,
        start: selectedEvent.startStr,
        end: selectedEvent.endStr,
        color,
        textColor,
        bgImage: imageData,
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

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('menuDropdown').classList.toggle('hidden');
  });

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

  document.getElementById('saveBtn').addEventListener('click', saveModalEvent);
  document.getElementById('deleteBtn').addEventListener('click', deleteModalEvent);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
});
