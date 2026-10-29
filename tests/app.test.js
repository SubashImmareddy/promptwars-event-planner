/**
 * @jest-environment jsdom
 */

// Setup DOM before importing app.js
document.body.innerHTML = `
  <div id="login-screen"></div>
  <div id="main-app" style="display:none;"></div>
  <aside id="app-sidebar" class="sidebar"></aside>
  <div id="sidebar-backdrop" class="sidebar-backdrop"></div>
  <button class="hamburger-btn"></button>
  <input id="apiKeyInput" value="" />
  <button id="removeKeyBtn"></button>
  <p id="keyStatus"></p>
  <div id="events-grid"></div>
  <div id="workspace-content"></div>
  <h2 id="ws-title"></h2>
`;

const {
    escapeHTML,
    calculateFinancialSummary,
    buildSmartFallbackBlueprint,
    setTheme,
    setFontSize
} = require('../app.js');

const vercelHandler = require('../api/generate-plan.js');

describe('NexusPlan V2.0 - Core Unit, Security & AI Architect Test Suite', () => {

    // 1. FINANCIAL ENGINE TESTS
    describe('Financial Calculation Engine', () => {
        test('accurately calculates total spent and remaining available budget', () => {
            const expenses = [
                { name: 'Venue Setup', cost: 70000 },
                { name: 'Tech Catering', cost: 50000 }
            ];
            const result = calculateFinancialSummary(200000, expenses);
            expect(result.budget).toBe(200000);
            expect(result.spent).toBe(120000);
            expect(result.remaining).toBe(80000);
            expect(result.isOverBudget).toBe(false);
        });

        test('detects over-budget state when expenses exceed allocated budget', () => {
            const expenses = [
                { name: 'Main Stage AV', cost: 65000 },
                { name: 'Hospitality', cost: 45000 }
            ];
            const result = calculateFinancialSummary(100000, expenses);
            expect(result.spent).toBe(110000);
            expect(result.remaining).toBe(-10000);
            expect(result.isOverBudget).toBe(true);
        });

        test('handles empty, null, or malformed expense arrays safely', () => {
            const result = calculateFinancialSummary(50000, null);
            expect(result.spent).toBe(0);
            expect(result.remaining).toBe(50000);
            expect(result.isOverBudget).toBe(false);
        });
    });

    // 2. SMART SEMANTIC FALLBACK ENGINE TESTS
    describe('Smart Semantic Preference Parser (buildSmartFallbackBlueprint)', () => {
        test('reserves 15% unspent buffer when user requests staying under budget', () => {
            const sampleEvent = {
                name: 'PromptWars AI Hackathon',
                type: 'Conference',
                location: 'Hyderabad',
                guests: 150,
                budget: 200000,
                preferences: 'Keep setup under budget to save buffer for prize pool. Evening 6pm to 10pm.'
            };

            const blueprint = buildSmartFallbackBlueprint(sampleEvent);
            const totalAllocated = blueprint.expenses.reduce((sum, e) => sum + e.cost, 0);

            // 85% of 200,000 = 170,000
            expect(totalAllocated).toBe(170000);
            expect(blueprint.summary).toContain('15%');
            expect(blueprint.tasks.length).toBe(8);
        });

        test('allocates 100% of budget when no under-budget constraint is specified', () => {
            const sampleEvent = {
                name: 'Annual Corporate Summit',
                type: 'Corporate',
                location: 'Bengaluru',
                guests: 300,
                budget: 100000,
                preferences: 'Standard executive keynote and networking dinner'
            };

            const blueprint = buildSmartFallbackBlueprint(sampleEvent);
            const totalAllocated = blueprint.expenses.reduce((sum, e) => sum + e.cost, 0);
            expect(totalAllocated).toBe(100000);
        });

        test('assigns exactly 2 tasks to each of the 4 chronological execution phases', () => {
            const sampleEvent = {
                name: 'Youth Birthday Gala',
                type: 'Birthday',
                location: 'Hyderabad',
                guests: 50,
                budget: 50000,
                preferences: 'Fun games and food for 16-18 yrs age group from 6pm to 10pm'
            };

            const blueprint = buildSmartFallbackBlueprint(sampleEvent);
            const phase1 = blueprint.tasks.filter(t => t.phase === 1);
            const phase2 = blueprint.tasks.filter(t => t.phase === 2);
            const phase3 = blueprint.tasks.filter(t => t.phase === 3);
            const phase4 = blueprint.tasks.filter(t => t.phase === 4);

            expect(phase1.length).toBe(2);
            expect(phase2.length).toBe(2);
            expect(phase3.length).toBe(2);
            expect(phase4.length).toBe(2);
        });
    });

    // 3. SECURITY & XSS SANITIZATION TESTS
    describe('Security & Input Sanitization', () => {
        test('neutralizes malicious script tags to prevent XSS attacks', () => {
            const maliciousInput = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
            const sanitized = escapeHTML(maliciousInput);
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).toContain('&lt;script&gt;');
        });
    });

    // 4. ACCESSIBILITY & THEME CONTROLLER TESTS
    describe('Accessibility & Theme State Persistence', () => {
        test('applies dark and light theme attributes to document body and localStorage', () => {
            setTheme('dark');
            expect(document.body.getAttribute('data-theme')).toBe('dark');
            expect(localStorage.getItem('theme')).toBe('dark');

            setTheme('light');
            expect(document.body.getAttribute('data-theme')).toBe('light');
        });

        test('switches accessibility font-size classes cleanly', () => {
            setFontSize('large');
            expect(document.body.classList.contains('font-large')).toBe(true);
            expect(document.body.classList.contains('font-medium')).toBe(false);
        });
    });

    // 5. SERVERLESS API ENDPOINT TESTS
    describe('Serverless Backend API Handler (/api/generate-plan)', () => {
        test('rejects non-POST HTTP methods with 405 Method Not Allowed', async () => {
            const req = { method: 'GET', body: {} };
            const res = {
                statusCode: 200,
                status: function(code) { this.statusCode = code; return this; },
                json: function(payload) { this.payload = payload; return this; }
            };

            await vercelHandler(req, res);
            expect(res.statusCode).toBe(405);
            expect(res.payload.error).toBe('Method Not Allowed');
        });
    });
});