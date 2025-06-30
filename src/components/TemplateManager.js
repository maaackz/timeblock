export class TemplateManager {
    constructor(app) {
        this.app = app;
        this.templates = this.loadTemplates();
        this.init();
    }

    init() {
        this.renderTemplates();
        this.setupDragAndDrop();
        this.setupEventToTemplateConversion();
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
        
        let html = '<div class="template-header">Templates</div>';
        this.templates.forEach(template => {
            html += `
                <div class="template-block" 
                     data-template-id="${template.id}"
                     draggable="true"
                     style="background-color: ${template.backgroundColor}; color: ${template.textColor}">
                    <div class="template-content">${template.title}</div>
                    <button class="template-delete-btn" data-template-id="${template.id}">&times;</button>
                </div>
            `;
        });

        // Add drop zone for creating templates from events
        html += `
            <div class="template-drop-zone" id="templateDropZone">
                <div class="drop-zone-text">Drop events here to create templates</div>
            </div>
        `;

        sidebar.innerHTML = html;
        this.attachTemplateListeners();
        this.setupTemplateDropZone();
        this.setupDragAndDrop(); // Re-setup drag and drop after rendering
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
        const templateBlocks = document.querySelectorAll('.template-block[data-template-id]');
        
        templateBlocks.forEach(block => {
            block.addEventListener('dragstart', (e) => {
                const templateId = block.dataset.templateId;
                const template = this.templates.find(t => t.id === templateId);
                if (template) {
                    // Set both JSON data and plain text for compatibility
                    e.dataTransfer.setData('application/json', JSON.stringify(template));
                    e.dataTransfer.setData('text/plain', JSON.stringify(template));
                    e.dataTransfer.effectAllowed = 'copy';
                    block.style.opacity = '0.5';
                }
            });

            block.addEventListener('dragend', (e) => {
                block.style.opacity = '1';
            });
        });
    }

    setupEventToTemplateConversion() {
        // Listen for dragstart on the document to catch event drags
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('event-preview') || e.target.classList.contains('event-block')) {
                const eventId = e.target.dataset.eventId;
                const event = this.app.events.find(ev => ev.id === eventId);
                if (event) {
                    // Store event data for template creation
                    e.dataTransfer.setData('event-data', JSON.stringify(event));
                    e.dataTransfer.setData('text/plain', event.title);
                }
            }
        });
    }

    setupTemplateDropZone() {
        const dropZone = document.getElementById('templateDropZone');
        if (!dropZone) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            // Only remove drag-over if we're actually leaving the drop zone
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            try {
                // Try to get event data first
                const eventData = e.dataTransfer.getData('event-data');
                if (eventData) {
                    const event = JSON.parse(eventData);
                    this.createTemplateFromEvent(event);
                    return;
                }
                
                // If no event data, check for other data types
                const textData = e.dataTransfer.getData('text/plain');
                if (textData) {
                    try {
                        const parsedData = JSON.parse(textData);
                        if (parsedData.title && parsedData.start_time) {
                            // This looks like an event
                            this.createTemplateFromEvent(parsedData);
                        }
                    } catch (parseError) {
                        console.log('Could not parse dropped text as event data');
                    }
                }
            } catch (error) {
                console.error('Failed to create template from dropped item:', error);
                alert('Failed to create template. Please try again.');
            }
        });
    }

    createTemplateFromEvent(event) {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        const durationMs = end.getTime() - start.getTime();
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const template = {
            id: Date.now().toString(),
            title: event.title,
            duration: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
            backgroundColor: event.background_color || '#2874A6',
            textColor: event.text_color || '#ffffff',
            tags: event.tags || ''
        };

        this.templates.push(template);
        this.saveTemplates();
        this.renderTemplates();
        
        alert(`Template "${template.title}" created successfully!`);
    }

    createEventFromTemplate(template, dropTarget) {
        const date = dropTarget.dataset.date;
        const hour = dropTarget.dataset.hour || '09';
        
        if (!date) {
            console.error('No date found on drop target');
            return;
        }

        // Parse duration
        const [hours, minutes] = template.duration.split(':').map(Number);
        const durationMs = (hours * 60 + minutes) * 60 * 1000;
        
        const startTime = new Date(`${date}T${hour.padStart(2, '0')}:00`);
        const endTime = new Date(startTime.getTime() + durationMs);

        const eventData = {
            title: template.title,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            background_color: template.backgroundColor || '#2874A6',
            text_color: template.textColor || '#ffffff',
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
    }

    deleteTemplate(templateId) {
        if (confirm('Are you sure you want to delete this template?')) {
            this.templates = this.templates.filter(t => t.id !== templateId);
            this.saveTemplates();
            this.renderTemplates();
        }
    }
}