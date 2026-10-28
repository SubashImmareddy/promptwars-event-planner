// ==========================================
// 1. STATE & SYSTEM THEME INITIALIZATION
// ==========================================
let eventsData = JSON.parse(localStorage.getItem('events_backup')) || [];
let dbClient = null;
let budgetChartInstance = null;

try {
    const supabaseUrl = 'https://gbkqhyfynkhsumcreoqw.supabase.co';
    const supabaseKey = 'sb_publishable_StZxKz5BM_yZTU3ya80VaQ_rCqOYGDQ';
    if (window.supabase && window.supabase.createClient) {
        dbClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    }
} catch (err) {
    console.warn("Supabase init skipped.");
}

// Font Accessibility
const savedFontSize = localStorage.getItem('fontSize') || 'medium';
document.body.classList.remove('font-small', 'font-medium', 'font-large');
document.body.classList.add('font-' + savedFontSize);

// Smart Theme Detection
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const themeToSet = prefersDark ? 'dark' : 'light';
        document.body.setAttribute('data-theme', themeToSet);
        localStorage.setItem('theme', themeToSet);

        setTimeout(function() {
            showToastNotice('Adapted to your system default ' + themeToSet + ' theme.');
        }, 800);
    } else {
        document.body.setAttribute('data-theme', savedTheme);
    }
}
initTheme();

function showToastNotice(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = [
        '<div>',
        '<strong style="font-size: 14px; color: var(--text-main);">System Update</strong>',
        '<p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-muted);">' + message + '</p>',
        '</div>',
        '<button onclick="this.parentElement.remove()" class="btn-secondary" style="padding: 6px 12px; font-size: 12px;">OK</button>'
    ].join('');
    document.body.appendChild(toast);
    setTimeout(function() {
        if (toast.parentElement) toast.remove();
    }, 6000);
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

        if (!localStorage.getItem('geminiApiKey') && !sessionStorage.getItem('apiPromptShown')) {
            setTimeout(function() {
                document.getElementById('api-notice-modal').style.display = 'flex';
                sessionStorage.setItem('apiPromptShown', 'true');
            }, 500);
        }
    } else {
        errorMsg.style.display = 'block';
    }
}

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
    if (e) e.stopPropagation();
    document.getElementById('profile-dropdown').classList.toggle('show');
}

window.onclick = function(e) {
    if (!e.target.closest('.profile-menu-container')) {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
};

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

document.addEventListener('DOMContentLoaded', function() {
    checkLoginState();
    const passInput = document.getElementById('loginPass');
    const userInput = document.getElementById('loginUser');
    [userInput, passInput].forEach(function(input) {
        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLogin();
                }
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
    document.body.classList.add('font-' + size);
    localStorage.setItem('fontSize', size);
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

// ==========================================
// 5. CLOUD SYNC & DASHBOARD
// ==========================================
async function syncDatabase() {
    const localBackup = JSON.parse(localStorage.getItem('events_backup')) || [];
    if (dbClient) {
        try {
            const response = await dbClient
                .from('events')
                .select('*')
                .order('created_at', { ascending: false });
            if (response.error) throw response.error;
            eventsData = (response.data && response.data.length > 0) ? response.data : localBackup;
            localStorage.setItem('events_backup', JSON.stringify(eventsData));
        } catch (err) {
            eventsData = localBackup;
        }
    } else {
        eventsData = localBackup;
    }
    renderDashboard();
}

async function updateDatabaseRecord(itemObj) {
    localStorage.setItem('events_backup', JSON.stringify(eventsData));
    if (dbClient) {
        try {
            await dbClient
                .from('events')
                .update({
                    expenses: itemObj.expenses,
                    tasks: itemObj.tasks,
                    ai_plan: itemObj.ai_plan
                })
                .eq('id', itemObj.id);
        } catch (err) {}
    }
}

function renderDashboard() {
    const grid = document.getElementById('events-grid');
    if (!grid) return;
    if (!eventsData || eventsData.length === 0) {
        grid.innerHTML = [
            '<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--card-bg); border-radius: 12px; border: 1px dashed var(--border);">',
            '<p class="text-muted">No projects found. Click <strong>Create New Event</strong> to get started.</p>',
            '</div>'
        ].join('');
        return;
    }
    grid.innerHTML = '';
    eventsData.forEach(function(item) {
        const daysLeft = Math.ceil((new Date(item.date) - new Date()) / (1000 * 60 * 60 * 24));
        const daysBadge = isNaN(daysLeft) ? item.date : (daysLeft + ' days away');

        grid.innerHTML += [
            '<div class="event-card" style="position: relative;">',
            '<button type="button" onclick="deleteEvent(' + item.id + ')" class="btn-danger" style="position: absolute; top: 20px; right: 20px; z-index: 2;">Delete</button>',
            '<div onclick="openWorkspace(' + item.id + ')">',
            '<h3 style="margin:0 0 8px 0; padding-right: 70px; font-weight: 600;">' + item.name + '</h3>',
            '<p class="text-muted" style="margin:0 0 15px 0;">' + item.type + ' | ' + item.date + '</p>',
            '<div style="display: inline-block; background: rgba(79, 70, 229, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">',
            'Due: ' + daysBadge,
            '</div>',
            '</div>',
            '</div>'
        ].join('');
    });
}

// ==========================================
// 6. NAVIGATION & EVENT CREATION
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(function(tab) {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    if (tabId !== 'tab-workspace') {
        const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(function(b) {
            return b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId);
        });
        if (activeBtn) activeBtn.classList.add('active');
    }
    if (tabId === 'tab-dashboard') renderDashboard();
}

const createForm = document.getElementById('create-event-form');
if (createForm) {
    createForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = "Initializing...";
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

        eventsData.unshift(newEvent);
        localStorage.setItem('events_backup', JSON.stringify(eventsData));

        if (dbClient) {
            try {
                await dbClient.from('events').insert([newEvent]);
            } catch (err) {}
        }

        e.target.reset();
        btn.innerText = originalText;
        btn.disabled = false;
        switchTab('tab-dashboard');
    });
}

// ==========================================
// 7. WORKSPACE UI, MUTATIONS & LIVE CHARTING
// ==========================================
function openWorkspace(eventId) {
    const currentItem = eventsData.find(function(e) {
        return e.id === eventId;
    });
    if (!currentItem) return;
    document.getElementById('ws-title').innerText = currentItem.name;

    const spent = currentItem.expenses
        ? currentItem.expenses.reduce(function(sum, exp) { return sum + Number(exp.cost); }, 0)
        : 0;
    const remaining = currentItem.budget - spent;
    const warning = remaining < 0
        ? '<span style="color:var(--danger); font-weight:bold;">(Over Budget)</span>'
        : '';

const expensesHTML = currentItem.expenses
        ? currentItem.expenses.map(function(exp, i) {
            return [
                '<li style="display: flex; justify-content: space-between; align-items: center; gap: 15px;">',
                '<span style="flex: 1; word-break: break-word; line-height: 1.4;">' + exp.name + '</span>',
                '<div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0; white-space: nowrap;">',
                '<span>Rs. ' + Number(exp.cost).toLocaleString() + '</span>',
                '<button type="button" class="btn-danger" onclick="removeExpense(' + currentItem.id + ', ' + i + ')">Remove</button>',
                '</div>',
                '</li>'
            ].join('');
        }).join('')
        : '';

    // V2: Group tasks by their AI-assigned Phase (1 through 4)
    let tasksHTML = '';
    if (currentItem.tasks && currentItem.tasks.length > 0) {
        const phases = [1, 2, 3, 4];
        const phaseNames = [
            "Phase 1: Foundation",
            "Phase 2: Vendor Lock-in",
            "Phase 3: Final Prep",
            "Phase 4: Execution"
        ];

        phases.forEach(function(phaseNum, index) {
            const phaseTasks = currentItem.tasks
                .map(function(t, i) {
                    const taskName = (typeof t === 'object' && t !== null) ? t.name : String(t);
                    const taskDone = (typeof t === 'object' && t !== null) ? Boolean(t.done) : false;
                    const taskPhase = (typeof t === 'object' && t !== null) ? Number(t.phase) : 0;
                    return { name: taskName, done: taskDone, phase: taskPhase, originalIndex: i };
                })
                .filter(function(t) {
                    return t.phase === phaseNum;
                });

            if (phaseTasks.length > 0) {
                tasksHTML += '<h4 style="margin: 15px 0 5px 0; color: var(--primary); font-size: 13px; text-transform: uppercase;">' + phaseNames[index] + '</h4>';
                phaseTasks.forEach(function(task) {
                    const lineStyle = task.done ? 'line-through' : 'none';
                    const opacityStyle = task.done ? '0.5' : '1';
                    const checkedAttr = task.done ? 'checked' : '';
                    tasksHTML += [
                        '<li>',
                        '<label style="text-decoration: ' + lineStyle + '; opacity: ' + opacityStyle + '; display:flex; align-items:center; gap:12px; cursor:pointer;">',
                        '<input type="checkbox" ' + checkedAttr + ' onchange="toggleTask(' + currentItem.id + ', ' + task.originalIndex + ')" style="width:auto; margin:0;"> ' + task.name,
                        '</label>',
                        '<button type="button" class="btn-danger" onclick="removeTask(' + currentItem.id + ', ' + task.originalIndex + ')">Remove</button>',
                        '</li>'
                    ].join('');
                });
            }
        });

        // Catch any tasks without a phase (manual additions or older tasks)
        const unphasedTasks = currentItem.tasks
            .map(function(t, i) {
                const taskName = (typeof t === 'object' && t !== null) ? t.name : String(t);
                const taskDone = (typeof t === 'object' && t !== null) ? Boolean(t.done) : false;
                const taskPhase = (typeof t === 'object' && t !== null) ? Number(t.phase) : 0;
                return { name: taskName, done: taskDone, phase: taskPhase, originalIndex: i };
            })
            .filter(function(t) {
                return !t.phase || t.phase < 1 || t.phase > 4;
            });

        if (unphasedTasks.length > 0) {
            tasksHTML += '<h4 style="margin: 15px 0 5px 0; color: var(--primary); font-size: 13px; text-transform: uppercase;">General Tasks</h4>';
            unphasedTasks.forEach(function(task) {
                const lineStyle = task.done ? 'line-through' : 'none';
                const opacityStyle = task.done ? '0.5' : '1';
                const checkedAttr = task.done ? 'checked' : '';
                tasksHTML += [
                    '<li>',
                    '<label style="text-decoration: ' + lineStyle + '; opacity: ' + opacityStyle + '; display:flex; align-items:center; gap:12px; cursor:pointer;">',
                    '<input type="checkbox" ' + checkedAttr + ' onchange="toggleTask(' + currentItem.id + ', ' + task.originalIndex + ')" style="width:auto; margin:0;"> ' + task.name,
                    '</label>',
                    '<button type="button" class="btn-danger" onclick="removeTask(' + currentItem.id + ', ' + task.originalIndex + ')">Remove</button>',
                    '</li>'
                ].join('');
            });
        }
    }

    const daysLeft = Math.ceil((new Date(currentItem.date) - new Date()) / (1000 * 60 * 60 * 24));
    let timelineText = "Completed";
    if (daysLeft > 30) {
        timelineText = "Early Planning";
    } else if (daysLeft > 7) {
        timelineText = "Finalizing";
    } else if (daysLeft >= 0) {
        timelineText = "Execution Mode";
    }

    const aiBoxDisplay = currentItem.ai_plan ? 'block' : 'none';

    document.getElementById('workspace-content').innerHTML = [
        '<div class="ws-section" style="grid-column: 1 / -1;">',
        '  <div style="display:flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">',
        '    <div>',
        '      <h3 style="margin-top:0;">NexusPlan AI Architect</h3>',
        '      <p class="text-muted" style="margin-bottom: 20px;">AI generation utilizes active API configuration.</p>',
        '    </div>',
        '    <div style="display:flex; gap: 10px;">',
        '      <button type="button" class="btn-secondary" onclick="exportEventReport(' + currentItem.id + ')">Export Executive PDF</button>',
        '      <button type="button" class="btn-primary" onclick="generateAIPlan(' + currentItem.id + ')">Generate Plan</button>',
        '    </div>',
        '  </div>',
        '  <div id="ai-plan-' + currentItem.id + '" class="ai-box" style="display:' + aiBoxDisplay + ';">' + (currentItem.ai_plan || '') + '</div>',
        '</div>',
        '<div class="ws-section">',
        '  <h3 style="margin-top:0;">Logistics</h3>',
        '  <p style="margin:5px 0;"><strong>Location:</strong> ' + currentItem.location + '</p>',
        '  <p style="margin:5px 0;"><strong>Headcount:</strong> ' + currentItem.guests + ' Guests</p>',
        '  <p style="margin:5px 0;"><strong>Phase:</strong> ' + timelineText + '</p>',
        '</div>',
        '<div class="ws-section" style="display: flex; flex-direction: column; gap: 20px;">',
        '  <h3 style="margin:0;">Financials</h3>',
        '  <div style="display: flex; gap: 20px; align-items: center;">',
        '    <div style="flex: 1;">',
        '      <p style="margin:0 0 15px 0;">Allocated: Rs. ' + currentItem.budget.toLocaleString() + ' | Available: Rs. ' + remaining.toLocaleString() + ' ' + warning + '</p>',
        '      <div style="display:flex; gap:10px; margin-bottom:20px;">',
        '        <input type="text" id="exp-name-' + currentItem.id + '" placeholder="Expense detail">',
        '        <input type="number" id="exp-cost-' + currentItem.id + '" placeholder="Amount" style="width: 120px;">',
        '        <button type="button" class="btn-secondary" onclick="addExpense(' + currentItem.id + ')">Add</button>',
        '      </div>',
        '    </div>',
        '    <div style="width: 140px; height: 140px; position: relative;">',
        '      <canvas id="budgetChart-' + currentItem.id + '"></canvas>',
        '    </div>',
        '  </div>',
        '  <ul class="checklist" style="max-height: 250px; overflow-y: auto;">' + expensesHTML + '</ul>',
        '</div>',
        '<div class="ws-section" style="grid-column: 1 / -1;">',
        '  <h3 style="margin-top:0;">Action Items (4-Phase Timeline)</h3>',
        '  <div style="display:flex; gap:10px; margin-bottom:20px;">',
        '    <input type="text" id="task-name-' + currentItem.id + '" placeholder="Describe task...">',
        '    <button type="button" class="btn-secondary" onclick="addTask(' + currentItem.id + ')">Add Manual Task</button>',
        '  </div>',
        '  <ul class="checklist">' + tasksHTML + '</ul>',
        '</div>'
    ].join('\n');

    switchTab('tab-workspace');
    renderBudgetChart(currentItem, spent, remaining);
}

// Chart Rendering Logic
function renderBudgetChart(currentItem, spent, remaining) {
    const ctx = document.getElementById('budgetChart-' + currentItem.id);
    if (!ctx) return;

    if (budgetChartInstance) budgetChartInstance.destroy();

    const overage = Math.max(0, spent - currentItem.budget);
    const validRemaining = Math.max(0, remaining);

    budgetChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Spent', 'Remaining', overage > 0 ? 'Over Budget' : ''],
            datasets: [{
                data: [spent, validRemaining, overage],
                backgroundColor: ['#4F46E5', '#E5E7EB', '#EF4444'],
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            animation: { animateScale: true }
        }
    });
}

function addExpense(eventId) {
    const name = document.getElementById('exp-name-' + eventId).value.trim();
    const cost = document.getElementById('exp-cost-' + eventId).value.trim();
    if (!name || !cost) return;
    const currentItem = eventsData.find(function(e) { return e.id === eventId; });
    if (!currentItem.expenses) currentItem.expenses = [];
    currentItem.expenses.push({ name: name, cost: Number(cost) });
    updateDatabaseRecord(currentItem);
    openWorkspace(eventId);
}

function removeExpense(id, index) {
    const currentItem = eventsData.find(function(e) { return e.id === id; });
    currentItem.expenses.splice(index, 1);
    updateDatabaseRecord(currentItem);
    openWorkspace(id);
}

function addTask(eventId) {
    const name = document.getElementById('task-name-' + eventId).value.trim();
    if (!name) return;
    const currentItem = eventsData.find(function(e) { return e.id === eventId; });
    if (!currentItem.tasks) currentItem.tasks = [];
    currentItem.tasks.push({ name: name, done: false, phase: null });
    updateDatabaseRecord(currentItem);
    openWorkspace(eventId);
}

function toggleTask(id, index) {
    const currentItem = eventsData.find(function(e) { return e.id === id; });
    if (typeof currentItem.tasks[index] === 'string') {
        currentItem.tasks[index] = { name: currentItem.tasks[index], done: true, phase: 1 };
    } else {
        currentItem.tasks[index].done = !currentItem.tasks[index].done;
    }
    updateDatabaseRecord(currentItem);
    openWorkspace(id);
}

function removeTask(id, index) {
    const currentItem = eventsData.find(function(e) { return e.id === id; });
    currentItem.tasks.splice(index, 1);
    updateDatabaseRecord(currentItem);
    openWorkspace(id);
}

async function deleteEvent(eventId) {
    if (confirm("Permanently delete this project?")) {
        eventsData = eventsData.filter(function(e) { return e.id !== eventId; });
        localStorage.setItem('events_backup', JSON.stringify(eventsData));
        renderDashboard();
        if (dbClient) {
            try {
                await dbClient.from('events').delete().eq('id', eventId);
            } catch (err) {}
        }
    }
}

// ==========================================
// 8. EXECUTIVE PDF / PRINT REPORT GENERATOR
// ==========================================
function exportEventReport(eventId) {
    const currentItem = eventsData.find(function(e) { return e.id === eventId; });
    if (!currentItem) return;

    const spent = currentItem.expenses
        ? currentItem.expenses.reduce(function(sum, exp) { return sum + Number(exp.cost); }, 0)
        : 0;
    const remaining = currentItem.budget - spent;

    const expenseRows = (currentItem.expenses || []).map(function(exp) {
        return '<tr><td style="padding:8px; border-bottom:1px solid #ddd;">' + exp.name + '</td><td style="padding:8px; border-bottom:1px solid #ddd; text-align:right;">Rs. ' + Number(exp.cost).toLocaleString() + '</td></tr>';
    }).join('');

    const taskRows = (currentItem.tasks || []).map(function(t) {
        const pLabel = t.phase ? ('Phase ' + t.phase) : 'General';
        const status = t.done ? '[Completed]' : '[Pending]';
        return '<tr><td style="padding:8px; border-bottom:1px solid #ddd;">' + pLabel + '</td><td style="padding:8px; border-bottom:1px solid #ddd;">' + t.name + '</td><td style="padding:8px; border-bottom:1px solid #ddd;">' + status + '</td></tr>';
    }).join('');

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
        showToastNotice('Please allow popups to export the Executive PDF Report.');
        return;
    }

    printWin.document.write([
        '<!DOCTYPE html><html><head><title>NexusPlan Executive Report - ' + currentItem.name + '</title>',
        '<style>body{font-family:Inter,Arial,sans-serif; padding:40px; color:#111827;} h1{color:#4F46E5; margin-bottom:5px;} table{width:100%; border-collapse:collapse; margin-top:15px;} th{background:#F3F4F6; text-align:left; padding:10px;}</style>',
        '</head><body>',
        '<h1>NexusPlan Executive Event Blueprint</h1>',
        '<p><strong>Event:</strong> ' + currentItem.name + ' (' + currentItem.type + ') | <strong>Date:</strong> ' + currentItem.date + ' | <strong>Location:</strong> ' + currentItem.location + ' | <strong>Guests:</strong> ' + currentItem.guests + '</p>',
        '<hr style="border:0; border-top:1px solid #E5E7EB; margin:20px 0;">',
        '<div>' + (currentItem.ai_plan || '<p>No AI strategy generated yet.</p>') + '</div>',
        '<h3>Financial Summary (Total Budget: Rs. ' + currentItem.budget.toLocaleString() + ' | Spent: Rs. ' + spent.toLocaleString() + ' | Remaining: Rs. ' + remaining.toLocaleString() + ')</h3>',
        '<table><thead><tr><th>Expense Item</th><th style="text-align:right;">Cost</th></tr></thead><tbody>' + expenseRows + '</tbody></table>',
        '<h3 style="margin-top:30px;">4-Phase Execution Checklist</h3>',
        '<table><thead><tr><th>Phase</th><th>Task Description</th><th>Status</th></tr></thead><tbody>' + taskRows + '</tbody></table>',
        '<p style="margin-top:40px; font-size:12px; color:#6B7280; text-align:center;">Generated by NexusPlan AI Architect - Copyright 2026 Subash Reddy</p>',
        '<script>window.onload = function(){ window.print(); };<\/script>',
        '</body></html>'
    ].join(''));
    printWin.document.close();
}

// ==========================================
// 9. HYBRID AI GENERATOR (V2 - 4-PHASE JSON & SMART DISCOVERY)
// ==========================================
async function generateAIPlan(eventId) {
    const localKey = localStorage.getItem('geminiApiKey');
    const planBox = document.getElementById('ai-plan-' + eventId);
    const currentItem = eventsData.find(function(e) { return e.id === eventId; });

    planBox.style.display = 'block';
    planBox.innerHTML = "<strong>Scanning API for latest active models and building workspace...</strong>";

    try {
        let rawOutput = "";
        let activeModel = "Serverless Fallback";

        if (localKey) {
            const modelRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + localKey);
            const modelData = await modelRes.json();

            if (modelData.error) throw new Error(modelData.error.message);

            const availableModels = modelData.models.map(function(m) {
                return m.name.replace('models/', '');
            });
            const preferredModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.0-flash', 'gemini-2.5-flash'];
            activeModel = preferredModels.find(function(model) {
                return availableModels.includes(model);
            }) || availableModels.find(function(m) {
                return m.includes('flash');
            });

            if (!activeModel) throw new Error("No compatible Gemini Flash models found for this API key.");

            const promptLines = [
                'Act as a premium event architect. Plan a ' + currentItem.type + ' named "' + currentItem.name + '".',
                'Location: ' + currentItem.location + '. Guests: ' + currentItem.guests + '. Budget: Rs. ' + currentItem.budget + '. Preferences: ' + currentItem.preferences + '.',
                'You MUST respond strictly in valid JSON format. Do not include markdown codeblocks.',
                'Structure the JSON exactly like this, ensuring every task is an object with "name" and "phase" (integer 1 to 4):',
                '{',
                '  "summary": "<h3>Creative Strategy</h3><p>A 2-sentence executive summary.</p>",',
                '  "expenses": [',
                '    { "name": "Venue Deposit", "cost": ' + Math.round(currentItem.budget * 0.4) + ' },',
                '    { "name": "Catering & Hospitality", "cost": ' + Math.round(currentItem.budget * 0.3) + ' }',
                '  ],',
                '  "tasks": [',
                '    { "name": "Lock in primary venue", "phase": 1 },',
                '    { "name": "Confirm vendor contracts", "phase": 2 },',
                '    { "name": "Finalize catering menu and seating", "phase": 3 },',
                '    { "name": "Execute day-of event coordination", "phase": 4 }',
                '  ]',
                '}',
                'Ensure the total of all expense costs roughly equals ' + currentItem.budget + '. Provide at least 4 expenses and 8 tasks (2 tasks for each phase 1, 2, 3, and 4).'
            ].join('\n');

            const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + activeModel + ':generateContent?key=' + localKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptLines }] }] })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error.message);

            rawOutput = data.candidates[0].content.parts[0].text;
        } else {
            const res = await fetch('/.netlify/functions/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentItem)
            });
            const data = await res.json();
            if (data.error && !data.plan) throw new Error(data.error);
            rawOutput = data.plan;
        }

        // Clean any markdown wrappers safely without using backtick literals
        const fence = String.fromCharCode(96, 96, 96);
        rawOutput = rawOutput.split(fence + 'json').join('').split(fence + 'html').join('').split(fence).join('').trim();

        const aiData = JSON.parse(rawOutput);

        currentItem.ai_plan = aiData.summary || ('Strategy successfully generated using ' + activeModel + '.');
        currentItem.expenses = [];
        currentItem.tasks = [];

        if (aiData.expenses && Array.isArray(aiData.expenses)) {
            aiData.expenses.forEach(function(exp) {
                currentItem.expenses.push({ name: exp.name, cost: Number(exp.cost) });
            });
        }

        if (aiData.tasks && Array.isArray(aiData.tasks)) {
            aiData.tasks.forEach(function(task, idx) {
                if (typeof task === 'object' && task !== null && task.name) {
                    currentItem.tasks.push({
                        name: task.name,
                        done: false,
                        phase: Number(task.phase) || ((idx % 4) + 1)
                    });
                } else {
                    currentItem.tasks.push({
                        name: String(task),
                        done: false,
                        phase: (idx % 4) + 1
                    });
                }
            });
        }

        updateDatabaseRecord(currentItem);
        openWorkspace(currentItem.id);

    } catch (err) {
        console.error("AI Generation Error:", err);
        currentItem.ai_plan = [
            '<div style="color: var(--danger);">',
            '<h3 style="margin-top:0;">Generation Failed</h3>',
            '<p>System Error: ' + err.message + '</p>',
            '</div>'
        ].join('');
        updateDatabaseRecord(currentItem);
        planBox.innerHTML = currentItem.ai_plan;
    }
}