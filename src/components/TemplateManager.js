export class TemplateManager {
    constructor(app) {
        this.app = app;
        this.templates = this.loadTemplates();
        this.init();
    }

    init() {
        this.renderTemplates();
        this.setupDragAndDrop();
    }

    loadTemplates() {
        const stored = localStorage.getItem('calendar-templates');
        return stored ? JSON.parse(stored) : [
            {
                id: '1',
                title: 'Morning Focus',
                duration: '01:30',
                backgroundColor: '#2874A6',
                textColor: '#ffffff',
                tags: 'focus,productivity'
            },
            {
                id: '2',
                title: 'Lunch Break',
                duration: '01:00',
                backgroundColor: '#28a745',
                textColor: '#ffffff',
                tags: 'break,food'
            },
            {
                id: '3',
                title: 'Meeting',
                duration: '00:30',
                backgroundColor: '#ffc107',
                textColor: '#000000',
                tags: 'work,meeting'
            }
        ];
    }

    saveTemplates() {
        localStorage.setItem('calendar-templates', JSON.stringify(this.templates));
    }

    renderTemplates() {
        const sidebar = document.getElementById('templateSidebar');
        
        let html = '';
        this.templates.forEach(template => {
            html += `
                <div class="template-block" 
                     data-template-id="${template.id}"
                     style="background-color: ${template.backgroundColor}; color: ${template.textColor}">
                    <div class="template-content">${template.title}</div>
                    <button class="template-delete-btn" data-template-id="${template.id}">&times;</button>
                </div>
            `;
        });

        sidebar.innerHTML = html;
        this.attachTemplateListeners();
    }

    attachTemplateListeners() {
        // Delete template buttons
        document.querySelectorAll('.template-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const templateId = e.target.dataset.templateId;
                this.deleteTemplate(templateId);
            });
        });
    }

    setupDragAndDrop() {
        const templateBlocks = document.querySelectorAll('.template-block');
        
        templateBlocks.forEach(block => {
            block.draggable = true;
            
            block.addEventListener('dragstart', (e) => {
                const templateId = block.dataset.templateId;
                const template = this.templates.find(t => t.id === templateId);
                e.dataTransfer.setData('application/json', JSON.stringify(template));
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        // Setup drop zones on calendar
        this.setupCalendarDropZones();
    }

    setupCalendarDropZones() {
        const calendar = document.getElementById('calendar');
        
        calendar.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        calendar.addEventListener('drop', (e) => {
            e.preventDefault();
            
            try {
                const template = JSON.parse(e.dataTransfer.getData('application/json'));
                const dropTarget = e.target.closest('.calendar-day, .time-slot');
                
                if (dropTarget) {
                    this.createEventFromTemplate(template, dropTarget);
                }
            } catch (error) {
                console.error('Failed to create event from template:', error);
            }
        });
    }

    createEventFromTemplate(template, dropTarget) {
        const date = dropTarget.dataset.date;
        const hour = dropTarget.dataset.hour || '09';
        
        if (!date) return;

        // Parse duration
        const [hours, minutes] = template.duration.split(':').map(Number);
        const durationMs = (hours * 60 + minutes) * 60 * 1000;
        
        const startTime = new Date(`${date}T${hour.padStart(2, '0')}:00`);
        const endTime = new Date(startTime.getTime() + durationMs);

        const eventData = {
            title: template.title,
            start_time: startTime.toISOString().slice(0, 16),
            end_time: endTime.toISOString().slice(0, 16),
            background_color: template.backgroundColor,
            text_color: template.textColor,
            tags: template.tags || '',
            recurring: 'none'
        };

        this.app.saveEvent(eventData);
    }

    addTemplate(templateData) {
        const newTemplate = {
            id: Date.now().toString(),
            ...templateData
        };
        
        this.templates.push(newTemplate);
        this.saveTemplates();
        this.renderTemplates();
        this.setupDragAndDrop();
    }

    deleteTemplate(templateId) {
        if (confirm('Are you sure you want to delete this template?')) {
            this.templates = this.templates.filter(t => t.id !== templateId);
            this.saveTemplates();
            this.renderTemplates();
            this.setupDragAndDrop();
        }
    }
}