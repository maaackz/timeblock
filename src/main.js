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
        this.calendarApp = new CalendarApp();
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
                if (isLogin) {
                    await this.authService.signIn(email, password);
                } else {
                    await this.authService.signUp(email, password);
                }
            } catch (error) {
                alert('Authentication failed: ' + error.message);
            }
        });

        skipAuth.addEventListener('click', () => {
            this.initCalendarApp();
        });
    }
}

// Initialize the app
new App();