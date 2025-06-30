import { CalendarApp } from './components/CalendarApp.js';
import { supabase, isSupabaseConfigured } from './services/supabase.js';
import { AuthService } from './services/auth.js';

class App {
    constructor() {
        this.authService = new AuthService();
        this.calendarApp = null;
        this.init();
    }

    async init() {
        try {
            // Check if Supabase is configured before using it
            if (isSupabaseConfigured()) {
                // Check authentication status
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session) {
                    this.initCalendarApp();
                } else {
                    this.showAuthUI();
                }

                // Listen for auth changes
                supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_IN') {
                        this.initCalendarApp();
                    } else if (event === 'SIGNED_OUT') {
                        this.showAuthUI();
                    }
                });
            } else {
                // Supabase not configured, run in offline mode
                this.initCalendarApp();
            }
        } catch (error) {
            console.error('App initialization error:', error);
            this.initCalendarApp(); // Fallback to offline mode
        }
    }

    initCalendarApp() {
        if (this.calendarApp) {
            this.calendarApp.destroy();
        }
        
        // Clear auth UI if it exists
        const authContainer = document.getElementById('authContainer');
        if (authContainer) {
            authContainer.remove();
        }
        
        // Restore main app HTML if needed
        if (!document.getElementById('menuWrapper')) {
            this.restoreMainAppHTML();
        }
        
        this.calendarApp = new CalendarApp();
    }

    restoreMainAppHTML() {
        document.getElementById('app').innerHTML = `
            <div id="menuWrapper">
                <button id="menuToggle">&#9776;</button>
                <div id="menuDropdown" class="hidden">
                    <button id="importBtn">Import JSON</button>
                    <input type="file" id="fileInput" accept=".json" style="display: none;">
                    <button id="exportBtn">Export JSON</button>
                    <button id="toggleDashboardBtn">Toggle Dashboard</button>
                    <button id="openSettingsBtn">Settings</button>
                    <button id="subscriptionBtn">Manage Subscription</button>
                </div>
            </div>

            <div id="templateSidebar">
                <div class="template-block" data-template='{"title":"Morning Focus","duration":"01:30","tags":["focus"],"backgroundColor":"#2874A6","textColor":"#ffffff"}'>
                    <div class="template-content">Morning Focus</div>
                    <button class="template-delete-btn">&times;</button>
                </div>
            </div>

            <main>
                <div id="calendarContainer">
                    <div id="calendarHeader">
                        <button id="prevBtn"><</button>
                        <h2 id="currentMonth"></h2>
                        <button id="nextBtn">></button>
                        <div id="viewToggle">
                            <button id="monthViewBtn" class="active">Month</button>
                            <button id="weekViewBtn">Week</button>
                            <button id="dayViewBtn">Day</button>
                        </div>
                    </div>
                    <div id="calendar"></div>
                </div>

                <div id="dashboardView" class="hidden">
                    <h2>Dashboard</h2>
                    <div id="timeProgress"></div>
                    <div id="tagFilter">
                        <label for="dashboardTagFilter">Filter by Tag:</label>
                        <input id="dashboardTagFilter" placeholder="e.g. study, exercise">
                    </div>
                    <div class="charts">
                        <canvas id="activityPieChart"></canvas>
                        <canvas id="lifetimeChart"></canvas>
                    </div>
                    <div id="tagTotals"></div>
                </div>

                <div id="settingsPanel" class="hidden">
                    <h3>Settings</h3>
                    <div class="settings-group">
                        <label for="birthDate">Birth Date</label>
                        <input type="datetime-local" id="birthDate">
                    </div>
                    <div class="settings-group">
                        <label for="lifespanYears">Lifespan (years)</label>
                        <input type="number" id="lifespanYears" step="0.01">
                    </div>
                    <div class="settings-group">
                        <label for="deathDate">Estimated Death Date</label>
                        <input type="datetime-local" id="deathDate" readonly>
                    </div>
                    <button id="saveSettingsBtn">Save Settings</button>
                </div>
            </main>

            <!-- Event Modal -->
            <div id="modalBackdrop" class="hidden"></div>
            <div id="eventModal" class="hidden">
                <h3 id="modalTitle">Event Details</h3>
                <form id="eventForm">
                    <div class="form-group">
                        <label for="eventTitle">Title:</label>
                        <input type="text" id="eventTitle" required>
                    </div>
                    <div class="form-group">
                        <label for="eventStartTime">Start Time:</label>
                        <input type="datetime-local" id="eventStartTime" required>
                    </div>
                    <div class="form-group">
                        <label for="eventEndTime">End Time:</label>
                        <input type="datetime-local" id="eventEndTime" required>
                    </div>
                    <div class="form-group">
                        <label for="eventColor">Background Color:</label>
                        <input type="color" id="eventColor" value="#2874A6">
                    </div>
                    <div class="form-group">
                        <label for="eventTextColor">Text Color:</label>
                        <input type="color" id="eventTextColor" value="#ffffff">
                    </div>
                    <div class="form-group">
                        <label for="eventTags">Tags (comma-separated):</label>
                        <input type="text" id="eventTags" placeholder="work, meeting, important">
                    </div>
                    <div class="form-group">
                        <label for="eventRecurring">Recurring:</label>
                        <select id="eventRecurring">
                            <option value="none">No Repeat</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div id="colorPreview">Preview</div>
                    <div class="modal-actions">
                        <button type="submit" id="saveEventBtn">Save</button>
                        <button type="button" id="deleteEventBtn" class="danger">Delete</button>
                        <button type="button" id="cancelEventBtn">Cancel</button>
                    </div>
                </form>
            </div>

            <!-- Subscription Modal -->
            <div id="subscriptionModal" class="hidden">
                <div class="modal-content">
                    <h3>Subscription Plans</h3>
                    <div class="pricing-cards">
                        <div class="pricing-card">
                            <h4>Basic</h4>
                            <p class="price">Free</p>
                            <ul>
                                <li>Up to 10 events</li>
                                <li>Basic calendar view</li>
                                <li>Local storage</li>
                            </ul>
                            <button class="plan-btn" data-plan="free">Current Plan</button>
                        </div>
                        <div class="pricing-card featured">
                            <h4>Pro</h4>
                            <p class="price">$9.99/month</p>
                            <ul>
                                <li>Unlimited events</li>
                                <li>Cloud sync</li>
                                <li>Advanced analytics</li>
                                <li>Export features</li>
                            </ul>
                            <button class="plan-btn" data-plan="pro">Upgrade</button>
                        </div>
                    </div>
                    <button id="closeSubscriptionModal">Close</button>
                </div>
            </div>
        `;
    }

    showAuthUI() {
        const authHTML = `
            <div id="authContainer" class="auth-container">
                <div class="auth-card">
                    <h2>Welcome to Custom Calendar</h2>
                    <div id="authTabs">
                        <button id="loginTab" class="auth-tab active">Login</button>
                        <button id="signupTab" class="auth-tab">Sign Up</button>
                    </div>
                    <form id="authForm">
                        <div class="form-group">
                            <label for="authEmail">Email:</label>
                            <input type="email" id="authEmail" required>
                        </div>
                        <div class="form-group">
                            <label for="authPassword">Password:</label>
                            <input type="password" id="authPassword" required>
                        </div>
                        <button type="submit" id="authSubmit">Login</button>
                    </form>
                    <button id="skipAuth" class="skip-btn">Continue Offline</button>
                </div>
            </div>
        `;

        document.getElementById('app').innerHTML = authHTML;
        this.setupAuthHandlers();
    }

    setupAuthHandlers() {
        const loginTab = document.getElementById('loginTab');
        const signupTab = document.getElementById('signupTab');
        const authForm = document.getElementById('authForm');
        const authSubmit = document.getElementById('authSubmit');
        const skipAuth = document.getElementById('skipAuth');

        let isLogin = true;

        loginTab.addEventListener('click', () => {
            isLogin = true;
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            authSubmit.textContent = 'Login';
        });

        signupTab.addEventListener('click', () => {
            isLogin = false;
            signupTab.classList.add('active');
            loginTab.classList.remove('active');
            authSubmit.textContent = 'Sign Up';
        });

        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;

            try {
                authSubmit.disabled = true;
                authSubmit.textContent = 'Processing...';
                
                if (isLogin) {
                    await this.authService.signIn(email, password);
                } else {
                    await this.authService.signUp(email, password);
                    alert('Account created successfully! Please check your email for verification.');
                }
            } catch (error) {
                alert('Authentication failed: ' + error.message);
                authSubmit.disabled = false;
                authSubmit.textContent = isLogin ? 'Login' : 'Sign Up';
            }
        });

        skipAuth.addEventListener('click', () => {
            this.initCalendarApp();
        });
    }
}

// Initialize the app
new App();