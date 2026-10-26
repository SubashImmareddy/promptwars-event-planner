// Navigation & Tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    
    if (tabId !== 'tab-workspace') {
        const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.getAttribute('onclick').includes(tabId));
        if(activeBtn) activeBtn.classList.add('active');
    }
    
    if (tabId === 'tab-dashboard') loadDashboardEvents();
}

// API Key Logic
function saveApiKey() {
    const key = document.getElementById('apiKeyInput').value;
    if(key) {
        localStorage.setItem('geminiApiKey', key);
        document.getElementById('keyStatus').innerText = "Key saved securely!";
        document.getElementById('apiKeyInput').value = '';
    }
}
if(localStorage.getItem('geminiApiKey')) {
    document.getElementById('keyStatus').innerText = "API Key is currently saved.";
}

// Form Submission
document.getElementById('create-event-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newEvent = {
        id: Date.now(),
        name: document.getElementById('eventName').value,
        type: document.getElementById('eventType').value,
        date: document.getElementById('eventDate').value,
        location: document.getElementById('eventLocation').value,
        guests: document.getElementById('guestCount').value,
        budget: document.getElementById('eventBudget').value,
        preferences: document.getElementById('eventPreferences').value,
        expenses: [],
        tasks: [],
        aiPlan: ""
    };
    const events = JSON.parse(localStorage.getItem('events')) || [];
    events.push(newEvent);
    localStorage.setItem('events', JSON.stringify(events));
    e.target.reset();
    switchTab('tab-dashboard');
});

// Render Dashboard Grid
function loadDashboardEvents() {
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const grid = document.getElementById('events-grid');
    grid.innerHTML = events.length === 0 ? '<p class="text-muted">No events yet. Create one!</p>' : '';
    
    events.forEach(event => {
        const daysLeft = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
        grid.innerHTML += `
            <div class="event-card" style="position: relative;">
                <button onclick="deleteEvent(${event.id})" class="btn-danger" style="position: absolute; top: 15px; right: 15px; padding: 5px 10px; z-index: 2;">Delete</button>
                <div onclick="openWorkspace(${event.id})">
                    <h3 style="margin-top:0; padding-right: 60px;">${event.name}</h3>
                    <p class="text-muted" style="margin:5px 0;">${event.type} | ${event.date}</p>
                    <p style="margin:0; font-weight:600; color:var(--primary);">🗓️ ${daysLeft} days away</p>
                </div>
            </div>
        `;
    });
}

// Render Event Workspace
function openWorkspace(eventId) {
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    document.getElementById('ws-title').innerText = `${event.name} Workspace`;
    
    // Budget Math
    const spent = event.expenses ? event.expenses.reduce((sum, exp) => sum + Number(exp.cost), 0) : 0;
    const remaining = event.budget - spent;
    const warning = remaining < 0 ? `<span style="color:#DC2626; font-weight:bold;">⚠️ Over Budget!</span>` : '';
    const expensesHTML = event.expenses ? event.expenses.map((exp, index) => 
        `<li><span>${exp.name}</span> <span>₹${exp.cost} <button class="btn-danger" onclick="removeExpense(${event.id}, ${index})">X</button></span></li>`
    ).join('') : '';

    // Task HTML
    const tasksHTML = event.tasks ? event.tasks.map((task, index) => 
        `<li>
            <label style="text-decoration: ${task.done ? 'line-through' : 'none'}; color: ${task.done ? 'var(--text-muted)' : 'var(--text-main)'}; display:flex; align-items:center; gap:10px;">
                <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${event.id}, ${index})" style="width:auto; margin:0;"> 
                ${task.name}
            </label>
            <button class="btn-danger" onclick="removeTask(${event.id}, ${index})">X</button>
        </li>`
    ).join('') : '';

    // Timeline Math
    const daysLeft = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
    let timelineText = daysLeft > 30 ? "Early Planning Phase" : daysLeft > 7 ? "Finalizing Phase" : daysLeft >= 0 ? "Execution Mode!" : "Event Passed";

    document.getElementById('workspace-content').innerHTML = `
        <div class="ws-section" style="grid-column: 1 / -1;">
            <h3 style="margin-top:0;">✨ AI Event Architect</h3>
            <button class="btn-primary" onclick="generateAIPlan(${event.id})" style="width:auto;">Generate / Refresh AI Plan</button>
            <div id="ai-plan-${event.id}" class="ai-box" style="display:${event.aiPlan ? 'block' : 'none'};">
                ${event.aiPlan || ''}
            </div>
        </div>

        <div class="ws-section">
            <h3 style="margin-top:0;">🗓️ Overview & Timeline</h3>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>Guests:</strong> ${event.guests}</p>
            <p><strong>Status:</strong> ${timelineText} (${daysLeft} days away)</p>
        </div>

        <div class="ws-section">
            <h3 style="margin-top:0;">💰 Budget Tracker</h3>
            <p style="margin-bottom:15px;">Budget: ₹${event.budget} | Spent: ₹${spent} | Remaining: ₹${remaining} ${warning}</p>
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <input type="text" id="exp-name-${event.id}" placeholder="Expense" style="margin:0;">
                <input type="number" id="exp-cost-${event.id}" placeholder="Cost" style="margin:0;">
                <button class="btn-secondary" onclick="addExpense(${event.id})" style="width:auto;">Add</button>
            </div>
            <ul class="checklist">${expensesHTML}</ul>
        </div>

        <div class="ws-section" style="grid-column: 1 / -1;">
            <h3 style="margin-top:0;">✅ Vendor & Task Checklist</h3>
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <input type="text" id="task-name-${event.id}" placeholder="New task..." style="margin:0;">
                <button class="btn-secondary" onclick="addTask(${event.id})" style="width:auto;">Add Task</button>
            </div>
            <ul class="checklist">${tasksHTML}</ul>
        </div>
    `;
    
    switchTab('tab-workspace');
}

// AI Integration
async function generateAIPlan(eventId) {
    const apiKey = localStorage.getItem('geminiApiKey');
    const planBox = document.getElementById(`ai-plan-${eventId}`);
    
    if(!apiKey) {
        planBox.style.display = 'block';
        planBox.innerHTML = "<span style='color:#DC2626;'>Please save your API key in settings first.</span>";
        return;
    }

    const events = JSON.parse(localStorage.getItem('events'));
    const event = events.find(e => e.id === eventId);
    
    planBox.style.display = 'block';
    planBox.innerHTML = "<strong>✨ Architecting your perfect event...</strong>";

    const prompt = `Act as a premium event architect. Plan a ${event.type} named "${event.name}". Location: ${event.location}. Guests: ${event.guests}. Budget: ₹${event.budget}. Preferences: ${event.preferences}. 
    Provide the response strictly in clean HTML format using <h3>, <ul>, and <li> tags. Do not use markdown blocks. 
    Structure it exactly like this:
    <h3>🎭 Creative Theme</h3> [Your theme description]
    <h3>💡 Unique Ideas</h3> <ul><li>[Idea 1]</li></ul>
    <h3>⚠️ Risk Management</h3> <ul><li>[Risk 1 & Mitigation]</li></ul>`;

    let aiOutput = "";
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        aiOutput = data.candidates[0].content.parts[0].text.replace(/```html/g, '').replace(/```/g, '');
    } catch (error) {
        aiOutput = `
            <div style="color: #B45309;">
                <strong>⚠️ AI Server Busy</strong><br>
                <h3>🎭 Classic Elegance</h3>
                <h3>💡 Ideas</h3><ul><li>Digital invitations</li><li>DIY photo booth</li></ul>
            </div>
        `;
    }
    
    // Save to event so it persists
    event.aiPlan = aiOutput;
    localStorage.setItem('events', JSON.stringify(events));
    planBox.innerHTML = aiOutput;
}

// Data Mutations
function addExpense(eventId) {
    const nameInput = document.getElementById(`exp-name-${eventId}`);
    const costInput = document.getElementById(`exp-cost-${eventId}`);
    if(!nameInput.value || !costInput.value) return;
    
    const events = JSON.parse(localStorage.getItem('events'));
    const event = events.find(e => e.id === eventId);
    if(!event.expenses) event.expenses = [];
    event.expenses.push({ name: nameInput.value, cost: costInput.value });
    
    localStorage.setItem('events', JSON.stringify(events));
    openWorkspace(eventId);
}

function removeExpense(eventId, expenseIndex) {
    const events = JSON.parse(localStorage.getItem('events'));
    events.find(e => e.id === eventId).expenses.splice(expenseIndex, 1);
    localStorage.setItem('events', JSON.stringify(events));
    openWorkspace(eventId);
}

function addTask(eventId) {
    const taskInput = document.getElementById(`task-name-${eventId}`);
    if(!taskInput.value) return;
    
    const events = JSON.parse(localStorage.getItem('events'));
    const event = events.find(e => e.id === eventId);
    if(!event.tasks) event.tasks = [];
    event.tasks.push({ name: taskInput.value, done: false });
    
    localStorage.setItem('events', JSON.stringify(events));
    openWorkspace(eventId);
}

function toggleTask(eventId, taskIndex) {
    const events = JSON.parse(localStorage.getItem('events'));
    const event = events.find(e => e.id === eventId);
    event.tasks[taskIndex].done = !event.tasks[taskIndex].done;
    localStorage.setItem('events', JSON.stringify(events));
    openWorkspace(eventId);
}

function removeTask(eventId, taskIndex) {
    const events = JSON.parse(localStorage.getItem('events'));
    events.find(e => e.id === eventId).tasks.splice(taskIndex, 1);
    localStorage.setItem('events', JSON.stringify(events));
    openWorkspace(eventId);
}

// Delete Event
function deleteEvent(eventId) {
    if (confirm("Are you sure you want to delete this event? This cannot be undone.")) {
        let events = JSON.parse(localStorage.getItem('events'));
        events = events.filter(e => e.id !== eventId);
        localStorage.setItem('events', JSON.stringify(events));
        
        switchTab('tab-dashboard'); 
    }
}

// Init
loadDashboardEvents();