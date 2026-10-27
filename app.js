// ==========================================
// 1. STATE & SYSTEM THEME INITIALIZATION
// ==========================================
let eventsData = JSON.parse(localStorage.getItem('events_backup')) || [];
let dbClient = null;

try {
    const supabaseUrl = 'https://gbkqhyfynkhsumcreoqw.supabase.co';
    const supabaseKey = 'sb_publishable_StZxKz5BM_yZTU3ya80VaQ_rCqOYGDQ';
    if (window.supabase && window.supabase.createClient) {
        dbClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    }
} catch (err) { console.warn("Supabase init skipped."); }

// Font Accessibility
const savedFontSize = localStorage.getItem('fontSize') || 'medium';
document.body.classList.remove('font-small', 'font-medium', 'font-large');
document.body.classList.add(`font-${savedFontSize}`);

// Smart Theme Detection
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
        // Adapt to system preference on first visit
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const themeToSet = prefersDark ? 'dark' : 'light';
        document.body.setAttribute('data-theme', themeToSet);
        localStorage.setItem('theme', themeToSet);
        
        setTimeout(() => {
            showToastNotice(`Adapted to your system's default ${themeToSet} theme.`);
        }, 800);
    } else {
        document.body.setAttribute('data-theme', savedTheme);
    }
}
initTheme();

// Custom Toast Function for System Alerts
function showToastNotice(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div>
            <strong style="font-size: 14px; color: var(--text-main);">System Update</strong>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-muted);">${message}</p>
        </div>
        <button onclick="this.parentElement.remove()" class="btn-secondary" style="padding: 6px 12px; font-size: 12px;">OK</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 6000);
}


// ==========================================
// 2. AUTH, LAYOUT TOGGLES & LOGOUT
// ==========================================
function checkLoginState() {
    if (localStorage.getItem('nova_admin_auth') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        syncDatabase();
    }
}

function handleLogin() {
    const user = document.getElementById('loginUser').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value.trim();
    const errorMsg = document.getElementById('loginError');
    
    if (user === 'admin' && pass === 'promptwars') {
        errorMsg.style.display = 'none';
        localStorage.setItem('nova_admin_auth', 'true');
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        syncDatabase();
        
        // Explicitly trigger API Modal popup after login if no key exists
        if (!localStorage.getItem('geminiApiKey') && !sessionStorage.getItem('apiPromptShown')) {
            setTimeout(() => {
                document.getElementById('api-notice-modal').style.display = 'flex';
                sessionStorage.setItem('apiPromptShown', 'true');
            }, 500);
        }
    } else {
        errorMsg.style.display = 'block';
    }
}

// Custom Logout Modal Logic
function confirmLogout() {
    document.getElementById('logout-modal').style.display = 'flex';
}
function closeLogoutModal() {
    document.getElementById('logout-modal').style.display = 'none';
}
function executeLogout() {
    localStorage.removeItem('nova_admin_auth');
    window.location.reload();
}

function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    sidebar.classList.toggle('collapsed');
}

function toggleDropdown(e) {
    if(e) e.stopPropagation();
    document.getElementById('profile-dropdown').classList.toggle('show');
}

window.onclick = function(event) {
    if (!event.target.closest('.profile-menu-container')) {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
}

function openContactModal() { 
    document.getElementById('contact-modal').style.display = 'flex'; 
}
function closeContactModal() { 
    document.getElementById('contact-modal').style.display = 'none'; 
}

// ==========================================
// 3. API NOTIFICATION MODAL
// ==========================================
function closeApiModal() {
    document.getElementById('api-notice-modal').style.display = 'none';
}
function goToApiSettings() {
    closeApiModal();
    switchTab('tab-api');
}

document.addEventListener('DOMContentLoaded', () => {
    checkLoginState(); 
    const passInput = document.getElementById('loginPass');
    const userInput = document.getElementById('loginUser');
    [userInput, passInput].forEach(input => {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
            });
        }
    });
});

// ==========================================
// 4. SETTINGS & ACCESSIBILITY
// ==========================================
function setTheme(mode) {
    document.body.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
}

function setFontSize(size) {
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${size}`);
    localStorage.setItem('fontSize', size);
}

// ==========================================
// 5. CLOUD SYNC & DASHBOARD
// ==========================================
async function syncDatabase() {
    const localBackup = JSON.parse(localStorage.getItem('events_backup')) || [];
    if (dbClient) {
        try {
            const { data, error } = await dbClient.from('events').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            eventsData = (data && data.length > 0) ? data : localBackup;
            localStorage.setItem('events_backup', JSON.stringify(eventsData));
        } catch (err) { eventsData = localBackup; }
    } else { eventsData = localBackup; }
    renderDashboard();
}

async function updateDatabaseRecord(event) {
    localStorage.setItem('events_backup', JSON.stringify(eventsData));
    if (dbClient) {
        try {
            await dbClient.from('events').update({ expenses: event.expenses, tasks: event.tasks, ai_plan: event.ai_plan }).eq('id', event.id);
        } catch (err) {}
    }
}

function renderDashboard() {
    const grid = document.getElementById('events-grid');
    if (!grid) return;
    if (!eventsData || eventsData.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--card-bg); border-radius: 12px; border: 1px dashed var(--border);"><p class="text-muted">No projects found. Click <strong>Create New Event</strong> to get started.</p></div>';
        return;
    }
    grid.innerHTML = '';
    eventsData.forEach(event => {
        const daysLeft = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
        const daysBadge = isNaN(daysLeft) ? event.date : `${daysLeft} days away`;
        
        grid.innerHTML += `
            <div class="event-card" style="position: relative;">
                <button type="button" onclick="deleteEvent(${event.id})" class="btn-danger" style="position: absolute; top: 20px; right: 20px; z-index: 2;">Delete</button>
                <div onclick="openWorkspace(${event.id})">
                    <h3 style="margin:0 0 8px 0; padding-right: 70px; font-weight: 600;">${event.name}</h3>
                    <p class="text-muted" style="margin:0 0 15px 0;">${event.type} &bull; ${event.date}</p>
                    <div style="display: inline-block; background: rgba(79, 70, 229, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                        Due: ${daysBadge}
                    </div>
                </div>
            </div>
        `;
    });
}

// ==========================================
// 6. NAVIGATION & EVENT CREATION
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    if (tabId !== 'tab-workspace') {
        const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId));
        if (activeBtn) activeBtn.classList.add('active');
    }
    if (tabId === 'tab-dashboard') renderDashboard();
}

function saveApiKey() {
    const keyInput = document.getElementById('apiKeyInput');
    const key = keyInput ? keyInput.value.trim() : '';
    if (key) {
        localStorage.setItem('geminiApiKey', key);
        document.getElementById('keyStatus').innerText = "Personal API Key saved and active.";
        keyInput.value = '';
    }
}

if (localStorage.getItem('geminiApiKey')) {
    const statusEl = document.getElementById('keyStatus');
    if (statusEl) statusEl.innerText = "Personal API Key is active.";
}

const createForm = document.getElementById('create-event-form');
if (createForm) {
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = "Initializing... ";
        btn.disabled = true;
        
        const newEvent = {
            id: Date.now(),
            name: document.getElementById('eventName').value,
            type: document.getElementById('eventType').value,
            date: document.getElementById('eventDate').value,
            location: document.getElementById('eventLocation').value,
            guests: Number(document.getElementById('guestCount').value) || 0,
            budget: Number(document.getElementById('eventBudget').value) || 0,
            preferences: document.getElementById('eventPreferences').value,
            expenses: [], tasks: [], ai_plan: ""
        };

        eventsData.unshift(newEvent);
        localStorage.setItem('events_backup', JSON.stringify(eventsData));

        if (dbClient) { try { await dbClient.from('events').insert([newEvent]); } catch (err) {} }
        
        e.target.reset();
        btn.innerText = originalText;
        btn.disabled = false;
        switchTab('tab-dashboard');
    });
}

// ==========================================
// 7. WORKSPACE UI & MUTATIONS
// ==========================================
function openWorkspace(eventId) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;
    document.getElementById('ws-title').innerText = `${event.name}`;
    
    const spent = event.expenses ? event.expenses.reduce((sum, exp) => sum + Number(exp.cost), 0) : 0;
    const remaining = event.budget - spent;
    const warning = remaining < 0 ? `<span style="color:var(--danger); font-weight:bold;">(Over Budget)</span>` : '';
    
    const expensesHTML = event.expenses ? event.expenses.map((exp, i) => 
        `<li><span>${exp.name}</span> <span>₹${exp.cost} <button type="button" class="btn-danger" style="margin-left: 10px;" onclick="removeExpense(${event.id}, ${i})">Remove</button></span></li>`
    ).join('') : '';

    const tasksHTML = event.tasks ? event.tasks.map((task, i) => 
        `<li>
            <label style="text-decoration: ${task.done ? 'line-through' : 'none'}; opacity: ${task.done ? '0.5' : '1'}; display:flex; align-items:center; gap:12px; cursor:pointer;">
                <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${event.id}, ${i})" style="width:auto; margin:0;"> ${task.name}
            </label>
            <button type="button" class="btn-danger" onclick="removeTask(${event.id}, ${i})">Remove</button>
        </li>`
    ).join('') : '';

    const daysLeft = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
    let timelineText = daysLeft > 30 ? "Early Planning" : daysLeft > 7 ? "Finalizing" : daysLeft >= 0 ? "Execution Mode" : "Completed";

    document.getElementById('workspace-content').innerHTML = `
        <div class="ws-section" style="grid-column: 1 / -1;">
            <div style="display:flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h3 style="margin-top:0;">NexusPlan AI Architect</h3>
                    <p class="text-muted" style="margin-bottom: 20px;">AI generation utilizes active API configuration.</p>
                </div>
                <button type="button" class="btn-primary" onclick="generateAIPlan(${event.id})">Generate Plan</button>
            </div>
            <div id="ai-plan-${event.id}" class="ai-box" style="display:${event.ai_plan ? 'block' : 'none'};">${event.ai_plan || ''}</div>
        </div>
        <div class="ws-section">
            <h3 style="margin-top:0;">Logistics</h3>
            <p style="margin:5px 0;"><strong>Location:</strong> ${event.location}</p>
            <p style="margin:5px 0;"><strong>Headcount:</strong> ${event.guests} Guests</p>
            <p style="margin:5px 0;"><strong>Phase:</strong> ${timelineText}</p>
        </div>
        <div class="ws-section">
            <h3 style="margin-top:0;">Financials</h3>
            <p style="margin:5px 0 15px 0;">Allocated: ₹${event.budget} &bull; Available: ₹${remaining} ${warning}</p>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <input type="text" id="exp-name-${event.id}" placeholder="Expense detail">
                <input type="number" id="exp-cost-${event.id}" placeholder="Amount" style="width: 140px;">
                <button type="button" class="btn-secondary" onclick="addExpense(${event.id})">Add</button>
            </div>
            <ul class="checklist">${expensesHTML}</ul>
        </div>
        <div class="ws-section" style="grid-column: 1 / -1;">
            <h3 style="margin-top:0;">Action Items</h3>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <input type="text" id="task-name-${event.id}" placeholder="Describe task...">
                <button type="button" class="btn-secondary" onclick="addTask(${event.id})">Add Task</button>
            </div>
            <ul class="checklist">${tasksHTML}</ul>
        </div>
    `;
    switchTab('tab-workspace');
}

function addExpense(eventId) {
    const name = document.getElementById(`exp-name-${eventId}`).value.trim();
    const cost = document.getElementById(`exp-cost-${eventId}`).value.trim();
    if (!name || !cost) return;
    const event = eventsData.find(e => e.id === eventId);
    if (!event.expenses) event.expenses = [];
    event.expenses.push({ name, cost });
    updateDatabaseRecord(event);
    openWorkspace(eventId);
}
function removeExpense(id, index) {
    const event = eventsData.find(e => e.id === id);
    event.expenses.splice(index, 1);
    updateDatabaseRecord(event);
    openWorkspace(id);
}
function addTask(eventId) {
    const name = document.getElementById(`task-name-${eventId}`).value.trim();
    if (!name) return;
    const event = eventsData.find(e => e.id === eventId);
    if (!event.tasks) event.tasks = [];
    event.tasks.push({ name, done: false });
    updateDatabaseRecord(event);
    openWorkspace(eventId);
}
function toggleTask(id, index) {
    const event = eventsData.find(e => e.id === id);
    event.tasks[index].done = !event.tasks[index].done;
    updateDatabaseRecord(event);
    openWorkspace(id);
}
function removeTask(id, index) {
    const event = eventsData.find(e => e.id === id);
    event.tasks.splice(index, 1);
    updateDatabaseRecord(event);
    openWorkspace(id);
}
async function deleteEvent(eventId) {
    if (confirm("Permanently delete this project?")) {
        eventsData = eventsData.filter(e => e.id !== eventId);
        localStorage.setItem('events_backup', JSON.stringify(eventsData));
        renderDashboard();
        if (dbClient) { try { await dbClient.from('events').delete().eq('id', eventId); } catch (err) {} }
    }
}

// ==========================================
// 8. HYBRID AI GENERATOR
// ==========================================
async function generateAIPlan(eventId) {
    const localKey = localStorage.getItem('geminiApiKey');
    const planBox = document.getElementById(`ai-plan-${eventId}`);
    const event = eventsData.find(e => e.id === eventId);
    
    planBox.style.display = 'block';
    planBox.innerHTML = "<strong>Synthesizing parameters...</strong>";
    let output = "";
    
    try {
        if (localKey) {
            const prompt = `Act as a premium event architect. Plan a ${event.type} named "${event.name}". Location: ${event.location}. Guests: ${event.guests}. Budget: ₹${event.budget}. Preferences: ${event.preferences}. Provide strictly clean HTML using <h3>, <ul>, <li>. Structure: <h3>Creative Theme</h3> <h3>Unique Ideas</h3> <h3>Risk Management</h3>`;
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${localKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            output = data.candidates[0].content.parts[0].text.replace(/```html/g, '').replace(/```/g, '');
        } else {
            const res = await fetch('/.netlify/functions/generate-plan', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });
            const data = await res.json();
            if (data.error && !data.plan) throw new Error(data.error);
            output = data.plan;
        }
    } catch (err) {
        output = `
            <div style="color: var(--text-main);">
                <h3 style="margin-top:0;">Strategy: "${event.name}"</h3>
                <p>Configured for <strong>${event.guests} attendees</strong> at <strong>${event.location}</strong>. Allocated Budget: <strong>₹${event.budget}</strong>.</p>
                <h3>Core Directives</h3>
                <ul style="padding-left:20px; line-height:1.6;">
                    <li>Secure primary venue & logistics (recommended allocation: ~45% / ₹${Math.round(event.budget * 0.45)})</li>
                    <li>Execute custom preferences: ${event.preferences || ' Standard digital RSVPs and curated lighting'}</li>
                </ul>
                <h3>Contingency Planning</h3>
                <ul style="padding-left:20px; line-height:1.6;">
                    <li>Hold a 10% safety buffer (₹${Math.round(event.budget * 0.1)}) for vendor adjustments</li>
                </ul>
            </div>
        `;
    }
    
    event.ai_plan = output;
    updateDatabaseRecord(event);
    planBox.innerHTML = output;
}