/**
 * @jest-environment jsdom
 */
'use strict';

document.body.innerHTML = `
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <div id="contact-modal" style="display:none;"></div>
  <div id="logout-modal" style="display:none;"></div>
  <div id="api-notice-modal" style="display:none;"></div>
  <div id="login-screen">
    <input id="loginUser" value="" />
    <input id="loginPass" value="" />
    <p id="loginError" style="display:none;"></p>
  </div>
  <div id="main-app" style="display:none;">
    <button class="hamburger-btn"></button>
    <div id="profile-dropdown" class="dropdown-menu"></div>
    <div id="sidebar-backdrop" class="sidebar-backdrop"></div>
    <aside id="app-sidebar" class="sidebar"></aside>
    <main class="content-area" id="main-content">
      <button class="nav-btn active" onclick="switchTab('tab-dashboard')"></button>
      <button class="nav-btn" onclick="switchTab('tab-create')"></button>
      <button class="nav-btn" onclick="switchTab('tab-api')"></button>
      <section id="tab-dashboard" class="tab-pane active"><div id="events-grid"></div></section>
      <section id="tab-create" class="tab-pane">
        <form id="create-event-form">
          <input id="eventName" value="AI Summit" />
          <select id="eventType"><option value="Conference" selected>Conference</option></select>
          <input id="eventDate" value="2026-12-15" />
          <input id="eventLocation" value="Hyderabad" />
          <input id="guestCount" value="150" />
          <input id="eventBudget" value="200000" />
          <textarea id="eventPreferences">Under budget with Wi-Fi from 6pm to 10pm</textarea>
          <button type="submit">Submit</button>
        </form>
      </section>
      <section id="tab-api" class="tab-pane">
        <input id="apiKeyInput" value="" />
        <button id="removeKeyBtn"></button>
        <p id="keyStatus"></p>
      </section>
      <section id="tab-workspace" class="tab-pane">
        <h2 id="ws-title"></h2>
        <div id="workspace-content"></div>
      </section>
    </main>
  </div>
`;

const app = require('../app.js');
const vercelHandler = require('../api/generate-plan.js');

describe('NexusPlan V2.0 Comprehensive Enterprise Test Suite', () => {

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        jest.restoreAllMocks();
    });

    describe('1. Security, Credentials & Input Sanitization', () => {
        test('escapeHTML neutralizes script injections and quotes', () => {
            expect(app.escapeHTML('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
            expect(app.escapeHTML(null)).toBe('');
            expect(app.escapeHTML(undefined)).toBe('');
        });

        test('verifyStagingCredentials validates encoded admin login accurately', () => {
            expect(app.verifyStagingCredentials('admin', 'promptwars')).toBe(true);
            expect(app.verifyStagingCredentials('ADMIN ', ' promptwars ')).toBe(true);
            expect(app.verifyStagingCredentials('admin', 'wrong')).toBe(false);
            expect(app.verifyStagingCredentials('', '')).toBe(false);
        });
    });

    describe('2. Financial & Timeline Pure Calculations', () => {
        test('calculateFinancialSummary computes spent, remaining, and overage states', () => {
            const summary = app.calculateFinancialSummary(100000, [
                { name: 'Venue', cost: 40000 },
                { name: 'AV', cost: 35000 }
            ]);
            expect(summary).toEqual({
                budget: 100000,
                spent: 75000,
                remaining: 25000,
                isOverBudget: false
            });

            const over = app.calculateFinancialSummary(50000, [{ name: 'Stage', cost: 60000 }]);
            expect(over.isOverBudget).toBe(true);
            expect(over.remaining).toBe(-10000);
        });

        test('evaluateEventTimeline classifies Early Planning, Finalizing, Execution, and Completed', () => {
            const future45 = new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0];
            const future15 = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
            const future2 = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
            const past = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];

            expect(app.evaluateEventTimeline(future45).timelineText).toBe('Early Planning');
            expect(app.evaluateEventTimeline(future15).timelineText).toBe('Finalizing');
            expect(app.evaluateEventTimeline(future2).timelineText).toBe('Execution Mode');
            expect(app.evaluateEventTimeline(past).timelineText).toBe('Completed');
        });
    });

    describe('3. Theme, Accessibility & UI Modals', () => {
        test('setTheme and setFontSize update DOM attributes and localStorage', () => {
            app.setTheme('dark');
            expect(document.body.getAttribute('data-theme')).toBe('dark');
            app.setTheme('light');
            expect(document.body.getAttribute('data-theme')).toBe('light');

            app.setFontSize('large');
            expect(document.body.classList.contains('font-large')).toBe(true);
            app.setFontSize('invalid');
            expect(document.body.classList.contains('font-medium')).toBe(true);
        });

        test('modal and sidebar controllers toggle visibility states', () => {
            app.openContactModal();
            expect(document.getElementById('contact-modal').style.display).toBe('flex');
            app.closeContactModal();
            expect(document.getElementById('contact-modal').style.display).toBe('none');

            app.confirmLogout();
            expect(document.getElementById('logout-modal').style.display).toBe('flex');
            app.closeLogoutModal();
            expect(document.getElementById('logout-modal').style.display).toBe('none');

            app.goToApiSettings();
            expect(document.getElementById('tab-api').classList.contains('active')).toBe(true);

            app.toggleSidebar();
            app.closeMobileSidebar();
            app.toggleDropdown({ stopPropagation: jest.fn() });
            app.showToastNotice('Test notification');
            expect(document.querySelector('.toast-notification')).not.toBeNull();
        });
    });

    describe('4. Authentication & Workspace Lifecycle', () => {
        test('handleLogin rejects invalid credentials and accepts valid admin credentials', () => {
            document.getElementById('loginUser').value = 'wrong';
            document.getElementById('loginPass').value = 'wrong';
            expect(app.handleLogin()).toBe(false);

            document.getElementById('loginUser').value = 'admin';
            document.getElementById('loginPass').value = 'promptwars';
            expect(app.handleLogin()).toBe(true);
            expect(localStorage.getItem('nova_admin_auth')).toBe('true');
            app.checkLoginState();
        });

        test('create event form, openWorkspace, expense/task CRUD, and PDF export execute cleanly', async () => {
            app.initEventListeners();
            const form = document.getElementById('create-event-form');
            form.dispatchEvent(new Event('submit'));

            app.renderDashboard();
            const cards = document.querySelectorAll('.event-card');
            expect(cards.length).toBeGreaterThan(0);

            // Extract created event ID from onclick attribute
            const openDiv = cards[0].querySelector('[role="button"]');
            const match = openDiv.getAttribute('onclick').match(/openWorkspace\((\d+)\)/);
            const eventId = Number(match[1]);

            app.openWorkspace(eventId);
            expect(document.getElementById('ws-title').innerText).toBe('AI Summit');

            // Add and remove expense
            document.getElementById('exp-name-' + eventId).value = 'Stage Audio';
            document.getElementById('exp-cost-' + eventId).value = '25000';
            app.addExpense(eventId);
            app.removeExpense(eventId, 0);

            // Add, toggle, and remove task
            document.getElementById('task-name-' + eventId).value = 'Confirm Keynote';
            app.addTask(eventId);
            app.toggleTask(eventId, 0);
            app.removeTask(eventId, 0);

            // Mock window.open for PDF export
            const mockWin = { document: { write: jest.fn(), close: jest.fn() } };
            jest.spyOn(window, 'open').mockReturnValue(mockWin);
            app.exportEventReport(eventId);
            expect(mockWin.document.write).toHaveBeenCalled();

            // Delete event
            jest.spyOn(window, 'confirm').mockReturnValue(true);
            await app.deleteEvent(eventId);
        });
    });

    describe('5. AI Architect, Smart Fallback & API Key Verification', () => {
        test('buildSmartFallbackBlueprint reserves 15% buffer on under-budget brief', () => {
            const bp = app.buildSmartFallbackBlueprint({
                name: 'PromptWars Hackathon',
                type: 'Conference',
                location: 'T-Hub Hyderabad',
                guests: 150,
                budget: 200000,
                preferences: 'Keep under budget for prize pool, age 16-18 yrs, 6pm to 10pm fun games and food'
            });
            const totalSpent = bp.expenses.reduce((s, e) => s + e.cost, 0);
            expect(totalSpent).toBe(170000);
            expect(bp.tasks.length).toBe(8);
        });

        test('applyAIPlanToEvent parses structured JSON and strips markdown fences', () => {
            const dummyEvent = { expenses: [], tasks: [], ai_plan: '' };
            const rawJson = '```json\n{"summary":"<h3>Plan</h3>","expenses":[{"name":"Wi-Fi","cost":10000}],"tasks":[{"name":"Setup","phase":1}]}\n```';
            app.applyAIPlanToEvent(dummyEvent, rawJson, 'gemini-2.5-flash');
            expect(dummyEvent.expenses.length).toBe(1);
            expect(dummyEvent.tasks.length).toBe(1);
            expect(dummyEvent.ai_plan).toContain('<h3>Plan</h3>');
        });

        test('saveApiKey validates format and handles live verification response', async () => {
            const input = document.getElementById('apiKeyInput');
            input.value = 'short';
            expect(await app.saveApiKey()).toBe(false);

            input.value = 'AIzaSyDummyValidLengthKey1234567890';
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ models: [{ name: 'models/gemini-2.5-flash' }] })
            });
            expect(await app.saveApiKey()).toBe(true);
            app.refreshApiKeyUI();
            app.removeApiKey();
            expect(localStorage.getItem('geminiApiKey')).toBeNull();
        });
    });

    describe('6. Serverless Backend Endpoint (/api/generate-plan)', () => {
        const createRes = () => ({
            statusCode: 200,
            headers: {},
            setHeader: function(k, v) { this.headers[k] = v; },
            status: function(c) { this.statusCode = c; return this; },
            json: function(p) { this.payload = p; return this; }
        });

        test('sets security headers and rejects GET requests with 405', async () => {
            const res = createRes();
            await vercelHandler({ method: 'GET' }, res);
            expect(res.statusCode).toBe(405);
            expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
        });

        test('returns 503 if GEMINI_API_KEY is missing on server', async () => {
            delete process.env.GEMINI_API_KEY;
            const res = createRes();
            await vercelHandler({ method: 'POST', body: { name: 'Test', budget: 50000 } }, res);
            expect(res.statusCode).toBe(503);
        });

        test('returns 200 with cleaned JSON plan when Gemini API responds', async () => {
            process.env.GEMINI_API_KEY = 'AIzaServerTestKey';
            global.fetch = jest.fn().mockResolvedValue({
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: '```json\n{"summary":"OK"}\n```' }] } }]
                })
            });
            const res = createRes();
            await vercelHandler({
                method: 'POST',
                body: JSON.stringify({ name: 'Tech Gala', type: 'Conference', location: 'Hyd', guests: 100, budget: 100000 })
            }, res);
            expect(res.statusCode).toBe(200);
            expect(res.payload.plan).toBe('{"summary":"OK"}');
        });
    });
});