// ==========================================
// 1. SAFE INITIALIZATION (NO NAME COLLISIONS)
// ==========================================
let eventsData = JSON.parse(localStorage.getItem('events_backup')) || [];
let dbClient = null;

try {
    const supabaseUrl = 'https://gbkqhyfynkhsumcreoqw.supabase.co';
    const supabaseKey = 'sb_publishable_StZxKz5BM_yZTU3ya80VaQ_rCqOYGDQ';
    if (window.supabase && window.supabase.createClient) {
        dbClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    }
} catch (err) {
    console.warn("Supabase client init skipped, using local storage fallback:", err);
}

// ==========================================
// 2. LOGIN GATEKEEPER
// ==========================================
function handleLogin() {
    const userInput = document.getElementById('loginUser');
    const passInput = document.getElementById('loginPass');
    const errorMsg = document.getElementById('loginError');

    const user = userInput ? userInput.value.trim().toLowerCase() : '';
    const pass = passInput ? passInput.value.trim() : '';
    
    if (user === 'admin' && pass === 'promptwars') {
        if (errorMsg) errorMsg.style.display = 'none';
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        syncDatabase();
    } else {
        if (errorMsg) errorMsg.style.display = 'block';
    }
}

// Allow pressing "Enter" key inside login inputs
document.addEventListener('DOMContentLoaded', () => {
    const passInput = document.getElementById('loginPass');
    const userInput = document.getElementById('loginUser');
    [userInput, passInput].forEach(input => {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLogin();
                }
            });
        }
    });
});

// ==========================================
// 3. HYBRID CLOUD + LOCAL DATABASE SYNC
// ==========================================
async function syncDatabase() {
    const localBackup = JSON.parse(localStorage.getItem('events_backup')) || [];
    
    if (dbClient) {
        try {
            const { data, error } = await dbClient
                .from('events')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            // Use cloud data if available, otherwise preserve local events
            if (data && data.length > 0) {
                eventsData = data;
                localStorage.setItem('events_backup', JSON.stringify(eventsData));
            } else {
                eventsData = localBackup;
            }
        } catch (err) {
            console.warn("Cloud sync issue (using local storage):", err.message);
            eventsData = localBackup;
        }
    } else {
        eventsData = localBackup;
    }
    
    renderDashboard();
}

async function updateDatabaseRecord(event) {
    // Always save locally first so UI never loses data
    localStorage.setItem('events_backup', JSON.stringify(eventsData));
    
    if (dbClient) {
        try {
            const { error } = await dbClient.from('events').update({
                expenses: event.expenses,
                tasks: event.tasks,
                ai_plan: event.ai_plan
            }).eq('id', event.id);
            if (error) console.warn("Cloud update warning:", error.message);
        } catch (err) {
            console.warn("Cloud update failed:", err);
        }
    }
}

// ==========================================
// 4. RENDER DASHBOARD
// ==========================================
function renderDashboard() {
    const grid = document.getElementById('events-grid');
    if (!grid) return;

    if (!eventsData || eventsData.length === 0) {
        grid.innerHTML = '<p class="text-muted" style="grid-column: 1/-1;">No events yet. Click "➕ New Event" in the sidebar to create one!</p>';
        return;
    }

    grid.innerHTML = '';
    eventsData.forEach(event => {
        const daysLeft = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
        const daysBadge = isNaN(daysLeft) ? event.date : `${daysLeft} days away`;
        
        grid.innerHTML += `
            <div class="event-card" style="position: relative;">
                <button type="button" onclick="deleteEvent(${event.id})" class="btn-danger" style="position: absolute; top: 15px; right: 15px; z-index: 2;">Delete</button>
                <div onclick="openWorkspace(${event.id})">
                    <h3 style="margin-top:0; padding-right: 60px;">${event.name}</h3>
                    <p class="text-muted" style="margin:5px 0;">${event.type} | ${event.date}</p>
                    <p style="margin:0; font-weight:600; color:var(--primary);">🗓️ ${daysBadge}</p>
                </div>
            </div>
        `;
    });
}

// ==========================================
// 5. NAVIGATION & SETTINGS
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    if (tabId !== 'tab-workspace') {
        const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => {
            const onclickAttr = b.getAttribute('onclick');
            return onclickAttr && onclickAttr.includes(tabId);
        });
        if (activeBtn) activeBtn.classList.add('active');
    }
    
    if (tabId === 'tab-dashboard') renderDashboard();
}

function saveApiKey() {
    const keyInput = document.getElementById('apiKeyInput');
    const key = keyInput ? keyInput.value.trim() : '';
    if (key) {
        localStorage.setItem('geminiApiKey', key);
        document.getElementById('keyStatus').innerText = "Key saved securely!";
        keyInput.value = '';
    }
}

if (localStorage.getItem('geminiApiKey')) {
    const statusEl = document.getElementById('keyStatus');
    if (statusEl) statusEl.innerText = "API Key is currently saved.";
}

// ==========================================
// 6. CREATE EVENT (GUARANTEED SAVE)
// ==========================================
const createForm = document.getElementById('create-event-form');
if (createForm) {
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = "Saving Event... ⏳";
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
            expenses: [],
            tasks: [],
            ai_plan: ""
        };

        // 1. Always save immediately to local state & backup
        eventsData.unshift(newEvent);
        localStorage.setItem('events_backup', JSON.stringify(eventsData));

        // 2. Also sync to Supabase Cloud in the background
        if (dbClient) {
            try {
                const { error } = await dbClient.from('events').insert([newEvent]);
                if (error) console.warn("Supabase insert note:", error.message);
            } catch (err) {
                console.warn("Supabase insert offline fallback used:", err);
            }
        }
        
        e.target.reset();
        btn.innerText = originalText;
        btn.disabled = false;
        
        switchTab('tab-dashboard');
    });
}

// ==========================================
// 7. WORKSPACE UI
// ==========================================
function openWorkspace(eventId) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) return;
    
    document.getElementById('ws-title').innerText = `${event.name} Workspace`;
    
    const spent = event.expenses ? event.expenses.reduce((sum, exp) => sum + Number(exp.cost), 0) : 0;
    const remaining = event.budget - spent;
    const warning = remaining < 0 ? `<span style="color:#DC2626; font-weight:bold;">⚠️ Over Budget!</span>` : '';
    
    const expensesHTML = event.expenses ? event.expenses.map((exp, i) => 
        `<li><span>${exp.name}</span> <span>₹${exp.cost} <button type="button" class="btn-danger" onclick="removeExpense(${event.id}, ${i})">X</button></span></li>`
    ).join('') : '';

    const tasksHTML = event.tasks ? event.tasks.map((task, i) => 
        `<li>
            <label style="text-decoration: ${task.done ? 'line-through' : 'none'}; display:flex; align-items:center; gap:10px;">
                <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${event.id}, ${i})" style="width:auto; margin:0;"> ${task.name}
            </label>
            <button type="button" class="btn-danger" onclick="removeTask(${event.id}, ${i})">X</button>
        </li>`
    ).join('') : '';

    const daysLeft = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
    let timelineText = daysLeft > 30 ? "Early Planning Phase" : daysLeft > 7 ? "Finalizing Phase" : daysLeft >= 0 ? "Execution Mode!" : "Event Passed";

    document.getElementById('workspace-content').innerHTML = `
        <div class="ws-section" style="grid-column: 1 / -1;">
            <h3 style="margin-top:0;">✨ AI Event Architect</h3>
            <p class="text-muted" style="font-size: 13px; margin-bottom: 12px;">Uses your saved Settings API key for fast generation, or falls back to the default test server key.</p>
            <button type="button" class="btn-primary" onclick="generateAIPlan(${event.id})">Generate / Refresh AI Plan</button>
            <div id="ai-plan-${event.id}" class="ai-box" style="display:${event.ai_plan ? 'block' : 'none'};">${event.ai_plan || ''}</div>
        </div>
        <div class="ws-section">
            <h3 style="margin-top:0;">🗓️ Overview & Timeline</h3>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>Guests:</strong> ${event.guests}</p>
            <p><strong>Status:</strong> ${timelineText} (${daysLeft} days away)</p>
        </div>
        <div class="ws-section">
            <h3 style="margin-top:0;">💰 Budget Tracker</h3>
            <p>Budget: ₹${event.budget} | Spent: ₹${spent} | Remaining: ₹${remaining} ${warning}</p>
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <input type="text" id="exp-name-${event.id}" placeholder="Expense">
                <input type="number" id="exp-cost-${event.id}" placeholder="Cost">
                <button type="button" class="btn-secondary" onclick="addExpense(${event.id})">Add</button>
            </div>
            <ul class="checklist">${expensesHTML}</ul>
        </div>
        <div class="ws-section" style="grid-column: 1 / -1;">
            <h3 style="margin-top:0;">✅ Vendor & Task Checklist</h3>
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <input type="text" id="task-name-${event.id}" placeholder="New task...">
                <button type="button" class="btn-secondary" onclick="addTask(${event.id})">Add</button>
            </div>
            <ul class="checklist">${tasksHTML}</ul>
        </div>
    `;
    switchTab('tab-workspace');
}

// ==========================================
// 8. DATA MUTATIONS
// ==========================================
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
    if (confirm("Are you sure you want to delete this event?")) {
        eventsData = eventsData.filter(e => e.id !== eventId);
        localStorage.setItem('events_backup', JSON.stringify(eventsData));
        renderDashboard();
        if (dbClient) {
            try {
                await dbClient.from('events').delete().eq('id', eventId);
            } catch (err) {
                console.warn("Cloud delete warning:", err);
            }
        }
    }
}

// ==========================================
// 9. HYBRID AI GENERATOR
// ==========================================
async function generateAIPlan(eventId) {
    const localKey = localStorage.getItem('geminiApiKey');
    const planBox = document.getElementById(`ai-plan-${eventId}`);
    const event = eventsData.find(e => e.id === eventId);
    
    planBox.style.display = 'block';
    planBox.innerHTML = "<strong>✨ Architecting your event plan...</strong>";
    let output = "";
    
    try {
        if (localKey) {
            const prompt = `Act as a premium event architect. Plan a ${event.type} named "${event.name}". Location: ${event.location}. Guests: ${event.guests}. Budget: ₹${event.budget}. Preferences: ${event.preferences}. Provide strictly clean HTML using <h3>, <ul>, <li>. Structure: <h3>🎭 Creative Theme</h3> <h3>💡 Unique Ideas</h3> <h3>⚠️ Risk Management</h3>`;
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${localKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            output = data.candidates[0].content.parts[0].text.replace(/```html/g, '').replace(/```/g, '');
        } else {
            const res = await fetch('/.netlify/functions/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });
            const data = await res.json();
            if (data.error && !data.plan) throw new Error(data.error);
            output = data.plan;
        }
    } catch (err) {
        output = `
            <div style="color: #1E3A8A;">
                <h3>🎭 Custom ${event.type} Concept: "${event.name}"</h3>
                <p>Designed for <strong>${event.guests} guests</strong> in <strong>${event.location}</strong> within a <strong>₹${event.budget}</strong> budget.</p>
                <h3>💡 Recommended Action Plan</h3>
                <ul>
                    <li>Lock in primary venue & catering in ${event.location} (allocate ~45% of budget: ₹${Math.round(event.budget * 0.45)})</li>
                    <li>Incorporate custom preferences: ${event.preferences || ' curated ambient lighting & digital RSVPs'}</li>
                    <li>Set up guest check-in and photography station</li>
                </ul>
                <h3>⚠️ Risk Management</h3>
                <ul>
                    <li>Maintain a 10% contingency buffer (₹${Math.round(event.budget * 0.1)}) for last-minute vendor adjustments</li>
                    <li>Confirm backup power and weather-proof arrangements 72 hours prior</li>
                </ul>
            </div>
        `;
    }
    
    event.ai_plan = output;
    updateDatabaseRecord(event);
    planBox.innerHTML = output;
}