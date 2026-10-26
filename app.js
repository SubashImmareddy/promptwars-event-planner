const form = document.getElementById('create-event-form');
const eventsList = document.getElementById('events-list');

// API Key Logic
function saveApiKey() {
    const key = document.getElementById('apiKeyInput').value;
    if(key) {
        localStorage.setItem('geminiApiKey', key);
        document.getElementById('keyStatus').innerText = "Key saved securely!";
        document.getElementById('apiKeyInput').value = '';
    }
}

// Load events
function loadEvents() {
    const events = JSON.parse(localStorage.getItem('events')) || [];
    eventsList.innerHTML = events.length === 0 ? '<p>No events found.</p>' : '';
    
    events.forEach(event => {
        // --- BUDGET LOGIC ---
        const spent = event.expenses ? event.expenses.reduce((sum, exp) => sum + Number(exp.cost), 0) : 0;
        const remaining = event.budget - spent;
        const warning = remaining < 0 ? `<span style="color:red; font-weight:bold;">⚠️ Over Budget!</span>` : '';
        const expensesHTML = event.expenses ? event.expenses.map((exp, index) => 
            `<li style="margin-bottom:5px;">${exp.name}: ₹${exp.cost} 
            <button onclick="removeExpense(${event.id}, ${index})" style="background:red; padding:2px 6px; margin-left:10px; width:auto; display:inline;">X</button></li>`
        ).join('') : '';

        // --- TIMELINE LOGIC ---
        const daysLeft = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
        let timelineText = "";
        if (daysLeft > 30) timelineText = "🗓️ Phase: Early Planning. Focus on venue and major vendors.";
        else if (daysLeft > 7) timelineText = "🗓️ Phase: Finalizing. Confirm details with vendors and guests.";
        else if (daysLeft >= 0) timelineText = "🚨 Phase: Final Countdown! Execution mode.";
        else timelineText = "✅ Event has passed. Hope it was great!";

        // --- CHECKLIST LOGIC ---
        const tasksHTML = event.tasks ? event.tasks.map((task, index) => 
            `<li style="margin-bottom:5px; text-decoration: ${task.done ? 'line-through' : 'none'};">
                <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${event.id}, ${index})" style="width:auto; display:inline; margin-right:10px;">
                ${task.name}
                <button onclick="removeTask(${event.id}, ${index})" style="background:red; padding:2px 6px; margin-left:10px; width:auto; display:inline;">X</button>
            </li>`
        ).join('') : '';

        const div = document.createElement('div');
        div.className = 'event-card';
        div.innerHTML = `
            <h3>${event.name} (${event.type})</h3>
            <p><strong>Date:</strong> ${event.date} (${daysLeft} days away) | <strong>Location:</strong> ${event.location}</p>
            <p><strong>Guests:</strong> ${event.guests} | <strong>Total Budget:</strong> ₹${event.budget}</p>
            
            <button class="btn-secondary" onclick="generateAIPlan(${event.id})">✨ Generate AI Plan</button>
            <div id="ai-plan-${event.id}" class="ai-plan-box" style="display:none;"></div>
            
            <hr style="margin: 15px 0; border: 0; border-top: 1px solid #ddd;">
            <h4>Timeline & Milestones</h4>
            <p>${timelineText}</p>

            <hr style="margin: 15px 0; border: 0; border-top: 1px solid #ddd;">
            <h4>Budget Tracker</h4>
            <p>Spent: ₹${spent} | Remaining: ₹${remaining} ${warning}</p>
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <input type="text" id="exp-name-${event.id}" placeholder="Expense" style="margin:0;">
                <input type="number" id="exp-cost-${event.id}" placeholder="Cost" style="margin:0;">
                <button onclick="addExpense(${event.id})" class="btn-secondary" style="margin:0; width:auto; padding:0 15px;">Add</button>
            </div>
            <ul style="list-style:none; padding:0;">${expensesHTML}</ul>

            <hr style="margin: 15px 0; border: 0; border-top: 1px solid #ddd;">
            <h4>Vendor & Task Checklist</h4>
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <input type="text" id="task-name-${event.id}" placeholder="New Task (e.g., Book DJ)" style="margin:0;">
                <button onclick="addTask(${event.id})" class="btn-secondary" style="margin:0; width:auto; padding:0 15px;">Add</button>
            </div>
            <ul style="list-style:none; padding:0;">${tasksHTML}</ul>
        `;
        eventsList.appendChild(div);
    });
}

// Form Submission
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newEvent = {
        id: Date.now(),
        name: document.getElementById('eventName').value,
        type: document.getElementById('eventType').value,
        date: document.getElementById('eventDate').value,
        location: document.getElementById('eventLocation').value,
        guests: document.getElementById('guestCount').value,
        budget: document.getElementById('eventBudget').value,
        preferences: document.getElementById('eventPreferences').value
    };
    const events = JSON.parse(localStorage.getItem('events')) || [];
    events.push(newEvent);
    localStorage.setItem('events', JSON.stringify(events));
    form.reset();
    loadEvents();
});

// Gemini API Integration
async function generateAIPlan(eventId) {
    const apiKey = localStorage.getItem('geminiApiKey');
    const planBox = document.getElementById(`ai-plan-${eventId}`);
    planBox.style.display = 'block';

    if(!apiKey) {
        planBox.innerHTML = "<span style='color:red;'>Please save your API key in settings first.</span>";
        return;
    }

    const events = JSON.parse(localStorage.getItem('events')) || [];
    const event = events.find(e => e.id === eventId);
    
    planBox.innerHTML = "Generating AI magic... ⏳";

    const prompt = `Act as an expert event planner. Plan a ${event.type} named "${event.name}". Location: ${event.location}. Guests: ${event.guests}. Budget: ₹${event.budget}. Preferences: ${event.preferences}. Provide: 1. A catchy theme. 2. Three unique ideas. 3. Two potential risks and solutions. Keep it concise.`;
try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        const aiText = data.candidates[0].content.parts[0].text;
        planBox.innerHTML = aiText.replace(/\n/g, '<br>');
    } catch (error) {
        console.error("AI Error:", error.message);
        planBox.innerHTML = `
            <div style="background: #fff3cd; padding: 10px; border: 1px solid #ffeeba; border-radius: 4px; color: #856404;">
                <strong>⚠️ AI Server Busy</strong><br>
                The AI is currently at capacity. Here is your fallback template:<br><br>
                <strong>Theme:</strong> Classic Elegance<br>
                <strong>Ideas:</strong> 1. Digital invitations, 2. DIY photo booth, 3. Signature mocktail<br>
                <strong>Risks:</strong> 1. Weather (Solution: Indoor backup), 2. Overspending (Solution: Use budget tracker)
            </div>
        `;
    }
}
// Add Task
function addTask(eventId) {
    const taskInput = document.getElementById(`task-name-${eventId}`);
    if(!taskInput.value) return;

    const events = JSON.parse(localStorage.getItem('events'));
    const event = events.find(e => e.id === eventId);
    
    if(!event.tasks) event.tasks = [];
    event.tasks.push({ name: taskInput.value, done: false });
    
    localStorage.setItem('events', JSON.stringify(events));
    loadEvents();
}

// Toggle Task Done
function toggleTask(eventId, taskIndex) {
    const events = JSON.parse(localStorage.getItem('events'));
    const event = events.find(e => e.id === eventId);
    
    event.tasks[taskIndex].done = !event.tasks[taskIndex].done;
    
    localStorage.setItem('events', JSON.stringify(events));
    loadEvents();
}

// Remove Task
function removeTask(eventId, taskIndex) {
    const events = JSON.parse(localStorage.getItem('events'));
    const event = events.find(e => e.id === eventId);
    
    event.tasks.splice(taskIndex, 1);
    
    localStorage.setItem('events', JSON.stringify(events));
    loadEvents();
}

// Initial check for API key UI status
if(localStorage.getItem('geminiApiKey')) {
    document.getElementById('keyStatus').innerText = "API Key is currently saved.";
}

loadEvents();