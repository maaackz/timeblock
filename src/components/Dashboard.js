import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables, ChartDataLabels);

export class Dashboard {
    constructor(app) {
        this.app = app;
        this.charts = {};
    }

    render() {
        this.renderTimeProgress();
        this.renderActivityChart();
        this.renderTagTotals();
        this.setupTagFilter();
    }

    renderTimeProgress() {
        const settings = JSON.parse(localStorage.getItem('calendar-settings') || '{}');
        if (!settings.birthDate || !settings.lifespanYears) {
            document.getElementById('timeProgress').innerHTML = `
                <p>Configure your birth date and lifespan in settings to see time progress.</p>
            `;
            return;
        }

        const birth = new Date(settings.birthDate);
        const now = new Date();
        const totalLifeMs = settings.lifespanYears * 365.25 * 24 * 60 * 60 * 1000;
        const livedMs = now - birth;
        const remainingMs = totalLifeMs - livedMs;

        const livedPercent = Math.min(100, (livedMs / totalLifeMs) * 100);
        const remainingPercent = Math.max(0, 100 - livedPercent);

        // Calculate awake/asleep time (assuming 8 hours sleep)
        const awakeHoursPerDay = 16;
        const sleepHoursPerDay = 8;
        const totalAwakeMs = (livedMs / (24 * 60 * 60 * 1000)) * awakeHoursPerDay * 60 * 60 * 1000;
        const totalSleepMs = livedMs - totalAwakeMs;

        const html = `
            <div class="time-progress-container">
                <div class="mini-bar-title">Lifetime Progress</div>
                <div class="time-progress-main">
                    <div class="time-progress-spent" style="width: ${livedPercent}%"></div>
                    <div class="time-progress-remaining" style="width: ${remainingPercent}%"></div>
                </div>
                <div class="time-sub-progress">
                    <div class="sub-section" style="width: ${livedPercent}%">
                        <div class="awake-asleep-track">
                            <div class="awake-bar awakeSpent" style="width: ${(totalAwakeMs / livedMs) * 100}%"></div>
                            <div class="asleep-bar asleepSpent" style="width: ${(totalSleepMs / livedMs) * 100}%"></div>
                        </div>
                    </div>
                </div>
                <div class="time-stats">
                    <p>Years lived: ${(livedMs / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1)}</p>
                    <p>Years remaining: ${(remainingMs / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1)}</p>
                </div>
            </div>
        `;

        document.getElementById('timeProgress').innerHTML = html;
    }

    renderActivityChart() {
        const canvas = document.getElementById('activityPieChart');
        if (!canvas) return;

        // Destroy existing chart
        if (this.charts.activity) {
            this.charts.activity.destroy();
        }

        // Calculate activity data
        const tagData = this.calculateTagTotals();
        const labels = Object.keys(tagData);
        const data = Object.values(tagData);
        const colors = this.generateColors(labels.length);

        this.charts.activity = new Chart(canvas, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    datalabels: {
                        formatter: (value, context) => {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${percentage}%`;
                        },
                        color: '#fff',
                        font: {
                            weight: 'bold'
                        }
                    }
                }
            }
        });
    }

    renderTagTotals() {
        const tagData = this.calculateTagTotals();
        const totalHours = Object.values(tagData).reduce((a, b) => a + b, 0);

        let html = '<h3>Activity Summary</h3><div class="tag-totals-grid">';
        
        Object.entries(tagData).forEach(([tag, hours]) => {
            const percentage = totalHours > 0 ? ((hours / totalHours) * 100).toFixed(1) : 0;
            html += `
                <div class="tag-total-item">
                    <span class="tag-name">${tag}</span>
                    <span class="tag-hours">${hours.toFixed(1)}h (${percentage}%)</span>
                </div>
            `;
        });

        html += '</div>';
        document.getElementById('tagTotals').innerHTML = html;
    }

    calculateTagTotals() {
        const tagTotals = {};

        this.app.events.forEach(event => {
            const start = new Date(event.start_time);
            const end = new Date(event.end_time);
            const hours = (end - start) / (1000 * 60 * 60);

            const tags = event.tags ? event.tags.split(',').map(t => t.trim()) : ['Untagged'];
            
            tags.forEach(tag => {
                if (!tagTotals[tag]) {
                    tagTotals[tag] = 0;
                }
                tagTotals[tag] += hours / tags.length; // Distribute hours among tags
            });
        });

        return tagTotals;
    }

    setupTagFilter() {
        const filterInput = document.getElementById('dashboardTagFilter');
        if (!filterInput) return;

        filterInput.addEventListener('input', (e) => {
            const filterTags = e.target.value.toLowerCase().split(',').map(t => t.trim()).filter(t => t);
            this.filterByTags(filterTags);
        });
    }

    filterByTags(filterTags) {
        if (filterTags.length === 0) {
            this.renderActivityChart();
            this.renderTagTotals();
            return;
        }

        // Filter events by tags
        const filteredEvents = this.app.events.filter(event => {
            const eventTags = event.tags ? event.tags.toLowerCase().split(',').map(t => t.trim()) : [];
            return filterTags.some(filterTag => 
                eventTags.some(eventTag => eventTag.includes(filterTag))
            );
        });

        // Temporarily replace events for rendering
        const originalEvents = this.app.events;
        this.app.events = filteredEvents;
        
        this.renderActivityChart();
        this.renderTagTotals();
        
        // Restore original events
        this.app.events = originalEvents;
    }

    generateColors(count) {
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
            '#4BC0C0', '#FF6384', '#36A2EB', '#FFCE56'
        ];
        
        return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
    }
}