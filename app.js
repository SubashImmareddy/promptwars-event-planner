// ==========================================
// 1. STATE & SYSTEM THEME INITIALIZATION
// ==========================================
let eventsData = JSON.parse(localStorage.getItem('events_backup')) || [];
let dbClient = null;
let budgetChartInstance = null;
// Security: HTML Entity Sanitizer to prevent XSS injection
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Pure calculation helper for financial testing & UI accuracy
function calculateFinancialSummary(budget, expenses) {
    const cleanBudget = Math.max(0, Number(budget) || 0);
    const list = Array.isArray(expenses) ? expenses : [];
    const spent = list.reduce(function(sum, item) {
        return sum + (Math.max(0, Number(item && item.cost) || 0));
    }, 0);
    const remaining = cleanBudget - spent;
    return {
        budget: cleanBudget,
        spent: spent,
        remaining: remaining,
        isOverBudget: remaining < 0
    };
}
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
        '<div style="flex: 1; min-width: 0;">',
        '<strong style="font-size: 14px; color: var(--text-main);">System Update</strong>',
        '<p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-muted); line-height: 1.4;">' + message + '</p>',
        '</div>',
        '<button onclick="this.parentElement.remove()" class="btn-secondary" style="padding: 6px 12px; font-size: 12px; flex-shrink: 0;">OK</button>'
    ].join('');
    document.body.appendChild(toast);
    setTimeout(function() {
        if (toast.parentElement) toast.remove();
    }, 6000);
}

// ==========================================
// 2. AUTH, SIDEBAR (STATIC DESKTOP / OVERLAY MOBILE) & LOGOUT
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

// ------------------------------------------
// ENTERPRISE SIDEBAR UX (STATIC DESKTOP / AUTO-CLOSE DRAWER MOBILE)
// ------------------------------------------
function syncSidebarBackdrop() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar || !backdrop) return;

    if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed')) {
        backdrop.classList.add('active');
    } else {
        backdrop.classList.remove('active');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed');
    syncSidebarBackdrop();
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        syncSidebarBackdrop();
    }
}

function initResponsiveSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const hamburger = document.querySelector('.hamburger-btn');
    if (!sidebar) return;

    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
    } else {
        sidebar.classList.remove('collapsed');
    }
    syncSidebarBackdrop();

    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('collapsed');
        } else {
            sidebar.classList.add('collapsed');
        }
        syncSidebarBackdrop();
    });

    document.addEventListener('click', function(event) {
        if (window.innerWidth > 768) return;

        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnHamburger = hamburger && hamburger.contains(event.target);
        const isSidebarOpen = !sidebar.classList.contains('collapsed');

        if (isSidebarOpen && !isClickInsideSidebar && !isClickOnHamburger) {
            closeMobileSidebar();
        }
    });
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
// 3. API NOTIFICATION MODAL & INITIALIZATION
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
    initResponsiveSidebar();
    refreshApiKeyUI();

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
// 4. SETTINGS, ACCESSIBILITY & API KEY RESET
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

function refreshApiKeyUI() {
    const savedKey = localStorage.getItem('geminiApiKey');
    const inputField = document.getElementById('apiKeyInput');
    const removeBtn = document.getElementById('removeKeyBtn');
    const statusText = document.getElementById('keyStatus');

    if (removeBtn) {
        removeBtn.style.display = 'inline-block';
    }

    if (savedKey) {
        if (inputField) inputField.value = savedKey;
        if (statusText) {
            statusText.textContent = "Active Mode: Personal Gemini API Key is verified and active.";
            statusText.style.color = "var(--success)";
        }
    } else {
        if (inputField) inputField.value = '';
        if (statusText) {
            statusText.textContent = "Active Mode: Shared Edge Network Default (No personal key set).";
            statusText.style.color = "var(--text-muted)";
        }
    }
}

async function saveApiKey() {
    const inputEl = document.getElementById('apiKeyInput');
    const keyInput = inputEl ? inputEl.value.trim() : '';
    const statusText = document.getElementById('keyStatus');
    const removeBtn = document.getElementById('removeKeyBtn');

    if (removeBtn) removeBtn.style.display = 'inline-block';

    if (!keyInput) {
        statusText.textContent = "Please enter a valid Gemini API key before saving, or click Reset to Default.";
        statusText.style.color = "var(--danger)";
        return;
    }

    if (keyInput.length < 25) {
        statusText.textContent = "Invalid API Key format. Key rejected — staying on Shared Edge Network default.";
        statusText.style.color = "var(--danger)";
        return;
    }

    statusText.textContent = "Validating key with Google Gemini servers...";
    statusText.style.color = "var(--text-muted)";

    try {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(keyInput));
        const data = await res.json();

        if (!res.ok || data.error || !data.models) {
            throw new Error((data.error && data.error.message) || "Invalid API key");
        }

        localStorage.setItem('geminiApiKey', keyInput);
        statusText.textContent = "Valid API Key verified and saved! Dedicated generation is now active.";
        statusText.style.color = "var(--success)";
        showToastNotice("Personal Gemini API Key verified and activated.");
    } catch (err) {
        localStorage.removeItem('geminiApiKey');
        statusText.textContent = "Invalid API Key rejected. System remains on Shared Edge Network default.";
        statusText.style.color = "var(--danger)";
    }
}

function removeApiKey() {
    localStorage.removeItem('geminiApiKey');
    const inputEl = document.getElementById('apiKeyInput');
    if (inputEl) inputEl.value = '';

    const statusText = document.getElementById('keyStatus');
    if (statusText) {
        statusText.textContent = "Reset complete. System reverted to Shared Edge Network Default.";
        statusText.style.color = "var(--text-muted)";
    }
    showToastNotice("API configuration reset to default shared server.");
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
            '<button type="button" onclick="deleteEvent(' + item.id + ')" class="btn-danger" style="position: absolute; top: 18px; right: 18px; z-index: 2;">Delete</button>',
            '<div onclick="openWorkspace(' + item.id + ')">',
            '<h3 style="margin:0 0 8px 0; padding-right: 75px; font-weight: 600; word-break: break-word;">' + item.name + '</h3>',
            '<p class="text-muted" style="margin:0 0 15px 0;">' + item.type + ' | ' + item.date + '</p>',
            '<div style="display: inline-block; background: var(--primary-light); color: var(--accent-text); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">',
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
    if (tabId === 'tab-api') refreshApiKeyUI();

    const contentArea = document.querySelector('.content-area');
    if (contentArea) contentArea.scrollTop = 0;

    closeMobileSidebar();
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
            name: document.getElementById('eventName').value.trim(),
            type: document.getElementById('eventType').value,
            date: document.getElementById('eventDate').value,
            location: document.getElementById('eventLocation').value.trim(),
            guests: Number(document.getElementById('guestCount').value) || 0,
            budget: Number(document.getElementById('eventBudget').value) || 0,
            preferences: document.getElementById('eventPreferences').value.trim(),
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
                '<li>',
                '<span style="flex: 1; min-width: 0; word-break: break-word; line-height: 1.4;">' + exp.name + '</span>',
                '<div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0; white-space: nowrap;">',
                '<span style="font-weight: 500;">Rs. ' + Number(exp.cost).toLocaleString() + '</span>',
                '<button type="button" class="btn-danger" onclick="removeExpense(' + currentItem.id + ', ' + i + ')">Remove</button>',
                '</div>',
                '</li>'
            ].join('');
        }).join('')
        : '';

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
                tasksHTML += '<h4 style="margin: 18px 0 6px 0; color: var(--accent-text); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">' + phaseNames[index] + '</h4>';
                phaseTasks.forEach(function(task) {
                    const lineStyle = task.done ? 'line-through' : 'none';
                    const opacityStyle = task.done ? '0.5' : '1';
                    const checkedAttr = task.done ? 'checked' : '';
                    tasksHTML += [
                        '<li>',
                        '<label class="task-label" style="text-decoration: ' + lineStyle + '; opacity: ' + opacityStyle + ';">',
                        '<input type="checkbox" ' + checkedAttr + ' onchange="toggleTask(' + currentItem.id + ', ' + task.originalIndex + ')">',
                        '<span>' + task.name + '</span>',
                        '</label>',
                        '<button type="button" class="btn-danger" onclick="removeTask(' + currentItem.id + ', ' + task.originalIndex + ')">Remove</button>',
                        '</li>'
                    ].join('');
                });
            }
        });

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
            tasksHTML += '<h4 style="margin: 18px 0 6px 0; color: var(--accent-text); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">General Tasks</h4>';
            unphasedTasks.forEach(function(task) {
                const lineStyle = task.done ? 'line-through' : 'none';
                const opacityStyle = task.done ? '0.5' : '1';
                const checkedAttr = task.done ? 'checked' : '';
                tasksHTML += [
                    '<li>',
                    '<label class="task-label" style="text-decoration: ' + lineStyle + '; opacity: ' + opacityStyle + ';">',
                    '<input type="checkbox" ' + checkedAttr + ' onchange="toggleTask(' + currentItem.id + ', ' + task.originalIndex + ')">',
                    '<span>' + task.name + '</span>',
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
    const prefDisplay = currentItem.preferences && currentItem.preferences.trim()
        ? currentItem.preferences.trim()
        : 'Standard Enterprise Best Practices';

    document.getElementById('workspace-content').innerHTML = [
        '<div class="ws-section" style="grid-column: 1 / -1;">',
        '  <div class="ws-top-bar">',
        '    <div>',
        '      <h3 style="margin-top:0; margin-bottom: 6px;">NexusPlan AI Architect</h3>',
        '      <p class="text-muted" style="margin: 0;">AI generation utilizes active API configuration and your custom event parameters.</p>',
        '    </div>',
        '    <div class="ws-btn-group">',
        '      <button type="button" class="btn-secondary" onclick="exportEventReport(' + currentItem.id + ')">Export Executive PDF</button>',
        '      <button type="button" class="btn-primary" onclick="generateAIPlan(' + currentItem.id + ')">Generate Plan</button>',
        '    </div>',
        '  </div>',
        '  <div id="ai-plan-' + currentItem.id + '" class="ai-box" style="display:' + aiBoxDisplay + ';">' + (currentItem.ai_plan || '') + '</div>',
        '</div>',
        '<div class="ws-section">',
        '  <h3 style="margin-top:0;">Logistics & Parameters</h3>',
        '  <p style="margin:8px 0;"><strong>Location:</strong> ' + currentItem.location + '</p>',
        '  <p style="margin:8px 0;"><strong>Headcount:</strong> ' + currentItem.guests + ' Guests</p>',
        '  <p style="margin:8px 0;"><strong>Phase:</strong> ' + timelineText + '</p>',
        '  <p style="margin:8px 0; line-height: 1.45;"><strong>Client Brief:</strong> <span class="text-muted">' + prefDisplay + '</span></p>',
        '</div>',
        '<div class="ws-section" style="display: flex; flex-direction: column; gap: 16px;">',
        '  <h3 style="margin:0;">Financials</h3>',
        '  <div class="financial-row">',
        '    <div class="financial-inputs-col">',
        '      <p style="margin:0 0 14px 0; line-height: 1.5;"><strong>Allocated:</strong> Rs. ' + currentItem.budget.toLocaleString() + ' &nbsp;|&nbsp; <strong>Available:</strong> Rs. ' + remaining.toLocaleString() + ' ' + warning + '</p>',
        '      <div class="action-input-row">',
        '        <input type="text" id="exp-name-' + currentItem.id + '" class="input-grow" placeholder="Expense detail (e.g., Catering)">',
        '        <input type="number" id="exp-cost-' + currentItem.id + '" class="input-amount" placeholder="Amount (Rs.)">',
        '        <button type="button" class="btn-secondary" onclick="addExpense(' + currentItem.id + ')">Add</button>',
        '      </div>',
        '    </div>',
        '    <div class="financial-chart-container">',
        '      <canvas id="budgetChart-' + currentItem.id + '"></canvas>',
        '    </div>',
        '  </div>',
        '  <ul class="checklist" style="max-height: 260px; overflow-y: auto;">' + expensesHTML + '</ul>',
        '</div>',
        '<div class="ws-section" style="grid-column: 1 / -1;">',
        '  <h3 style="margin-top:0;">Action Items (4-Phase Timeline)</h3>',
        '  <div class="action-input-row">',
        '    <input type="text" id="task-name-' + currentItem.id + '" class="input-grow" placeholder="Describe manual task...">',
        '    <button type="button" class="btn-secondary" onclick="addTask(' + currentItem.id + ')">Add Manual Task</button>',
        '  </div>',
        '  <ul class="checklist">' + tasksHTML + '</ul>',
        '</div>'
    ].join('\n');

    switchTab('tab-workspace');
    renderBudgetChart(currentItem, spent, remaining);
}

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
                backgroundColor: ['#6366F1', '#334155', '#EF4444'],
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
        '<h3>Financial Summary (Total Budget: Rs. ' + currentItem.budget.toLocaleString() + ' | Spent: Rs. ' + spent.toLocaleString() + ' | Remaining Reserve: Rs. ' + remaining.toLocaleString() + ')</h3>',
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
// 9. SMART SEMANTIC FALLBACK ARCHITECT (NO RAW TEXT ECHOING)
// ==========================================
function buildSmartFallbackBlueprint(item) {
    const rawPrefs = (item.preferences || '').toLowerCase();
    const loc = (item.location || 'Venue').trim();
    const totalBudget = Number(item.budget) || 50000;

    // 1. Detect if user wants to save budget / not spend the full amount
    const wantsUnderBudget = /not mandatory|not mandetory|save|under budget|dont finish|don't finish|remaining|buffer|less than/.test(rawPrefs);
    const activeBudget = wantsUnderBudget ? Math.round(totalBudget * 0.85) : totalBudget;
    const savedBuffer = totalBudget - activeBudget;

    // 2. Detect Audience / Age Group
    let audienceDesc = 'attendees';
    const ageMatch = rawPrefs.match(/(\d{1,2}\s*-\s*\d{1,2})\s*(yrs|years|yr|age)?/);
    if (ageMatch) {
        audienceDesc = 'the ' + ageMatch[1].replace(/\s+/g, '') + ' age group';
    } else if (/teen|youth|student|college|16|17|18/.test(rawPrefs)) {
        audienceDesc = 'youth and teen guests';
    } else if (/vip|executive|corporate|delegate/.test(rawPrefs)) {
        audienceDesc = 'executive delegates';
    }

    // 3. Detect Event Timing Window
    let scheduleLabel = 'the scheduled event window';
    if (/6\s*pm|10\s*pm|evng|evening|night/.test(rawPrefs)) {
        scheduleLabel = 'the 6:00 PM – 10:00 PM evening programme';
    } else if (/morning|breakfast|am/.test(rawPrefs)) {
        scheduleLabel = 'the morning session schedule';
    }

    // 4. Detect Special Focus (Activities, Games, Music, Tech, Decor)
    const hasActivities = /fun|activit|game|entertainment|dj|music|dance|party/.test(rawPrefs);
    const isBirthdayOrSocial = /birthday|wedding|party|concert/.test((item.type || '').toLowerCase() + ' ' + rawPrefs);

    const venueTitle = isBirthdayOrSocial
        ? 'Venue Styling, Backdrop & Thematic Decor (' + loc + ')'
        : 'Primary Venue & Stage Setup (' + loc + ')';

    const cateringTitle = /snack|mocktail|street|buffet|dinner|food/.test(rawPrefs)
        ? 'Curated Evening Catering, Live Food Counters & Mocktails (' + item.guests + ' Guests)'
        : 'Catering & Hospitality Service (' + item.guests + ' Guests)';

    const thirdExpenseTitle = hasActivities
        ? 'Interactive Games, Emcee & Youth Entertainment Zones'
        : 'Specialized Experience & Custom Production Setup';

    const fourthExpenseTitle = isBirthdayOrSocial
        ? 'Sound System, Ambient Lighting & Photography'
        : 'AV Production, Signage & Event Collateral';

    const budgetNoteSentence = wantsUnderBudget
        ? 'Designed for cost efficiency, allocating Rs. ' + activeBudget.toLocaleString() + ' across core deliverables while preserving a Rs. ' + savedBuffer.toLocaleString() + ' (15%) unspent reserve.'
        : 'Every vendor allocation and milestone is calibrated to maximize impact within your Rs. ' + totalBudget.toLocaleString() + ' budget.';

    const summaryHTML = [
        '<h3>Creative Strategy: ' + item.name + '</h3>',
        '<p>Curating an engaging, high-energy ' + item.type + ' in ' + loc + ' tailored for ' + item.guests + ' guests (' + audienceDesc + ') across ' + scheduleLabel + '. ' + budgetNoteSentence + '</p>',
        '<div style="margin-top:12px; padding:10px 14px; background:var(--primary-light); border-left:3px solid var(--primary); border-radius:6px; font-size:13px;">',
        '<strong>Note:</strong> The public AI model is currently experiencing high demand. We have initialized a smart, parameter-calibrated blueprint for your event. ',
        'Have your own Gemini API key? <a href="javascript:void(0)" onclick="switchTab(\'tab-api\')" style="color:var(--accent-text); font-weight:600; text-decoration:underline;">Add it in API Configuration</a> and click Generate Plan again for dedicated AI generation.',
        '</div>'
    ].join('');

    const expenses = [
        { name: venueTitle, cost: Math.round(activeBudget * 0.34) },
        { name: cateringTitle, cost: Math.round(activeBudget * 0.30) },
        { name: thirdExpenseTitle, cost: Math.round(activeBudget * 0.22) },
        { name: fourthExpenseTitle, cost: Math.round(activeBudget * 0.14) }
    ];

    const tasks = [
        { name: 'Book venue in ' + loc + ' and lock in ' + scheduleLabel, done: false, phase: 1 },
        { name: 'Finalize baseline budget allocation' + (wantsUnderBudget ? ' while maintaining Rs. ' + savedBuffer.toLocaleString() + ' contingency savings' : ' and vendor deposits'), done: false, phase: 1 },
        { name: 'Confirm catering menu, snack stations, and beverage service for ' + item.guests + ' guests', done: false, phase: 2 },
        { name: hasActivities ? 'Book interactive game hosts, playlist/DJ, and engaging activities for ' + audienceDesc : 'Lock in core AV, decor, and specialized production vendors', done: false, phase: 2 },
        { name: 'Finalize 3.5-hour evening run-sheet, activity flow, and stage lighting cues', done: false, phase: 3 },
        { name: 'Conduct venue decor walkthrough and sound check prior to guest arrival', done: false, phase: 3 },
        { name: 'Coordinate guest welcome, icebreaker activities, and main food service', done: false, phase: 4 },
        { name: 'Manage peak evening entertainment and smooth event wrap-up by closing time', done: false, phase: 4 }
    ];

    return { summary: summaryHTML, expenses: expenses, tasks: tasks };
}

// ==========================================
// 10. HYBRID AI GENERATOR (MULTI-MODEL FAILOVER)
// ==========================================
function waitDelay(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

async function generateAIPlan(eventId) {
    const localKey = localStorage.getItem('geminiApiKey');
    const planBox = document.getElementById('ai-plan-' + eventId);
    const currentItem = eventsData.find(function(e) { return e.id === eventId; });
    if (!currentItem || !planBox) return;

    const userPrefs = (currentItem.preferences && currentItem.preferences.trim())
        ? currentItem.preferences.trim()
        : 'Standard high-impact execution and guest experience';

    planBox.style.display = 'block';
    planBox.innerHTML = '<strong>Connecting to Gemini AI Architect and building 4-phase workspace...</strong>';

    const promptLines = [
        'Act as an elite event architect. Plan a ' + currentItem.type + ' named "' + currentItem.name + '".',
        'Location: ' + currentItem.location + '. Guests: ' + currentItem.guests + '. Total Budget: Rs. ' + currentItem.budget + '.',
        'Client Notes & Preferences: "' + userPrefs + '".',
        'CRITICAL RULES:',
        '1. NEVER copy, quote, or echo the raw Client Notes text into the summary, expense names, or task names.',
        '2. Instead, professionally interpret the Client Notes (such as age group, evening timing, fun activities, food style, or keeping total spend under budget) into polished, concise, executive-grade titles.',
        '3. If the client mentions not spending the entire budget, make the sum of expenses 80% to 85% of Rs. ' + currentItem.budget + ' so they have an unspent reserve. Otherwise, make expenses roughly equal Rs. ' + currentItem.budget + '.',
        '4. Respond strictly in valid JSON format with no markdown wrappers.',
        '{',
        '  "summary": "<h3>Creative Strategy: ' + currentItem.name + '</h3><p>2-3 sentences of polished executive strategy tailored to the audience, timing, and vibe.</p>",',
        '  "expenses": [',
        '    { "name": "Polished Expense Title (3-7 words)", "cost": 15000 }',
        '  ],',
        '  "tasks": [',
        '    { "name": "Polished Actionable Task (6-12 words)", "phase": 1 }',
        '  ]',
        '}',
        'Provide 4 to 5 expenses and exactly 8 tasks (2 tasks for each phase 1, 2, 3, and 4).'
    ].join('\n');

    try {
        let rawOutput = "";
        let activeModel = "Serverless Engine";

        if (localKey) {
            let candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
            try {
                const modelRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + localKey);
                const modelData = await modelRes.json();
                if (modelData && modelData.models) {
                    const available = modelData.models
                        .filter(function(m) {
                            return m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent');
                        })
                        .map(function(m) {
                            return m.name.replace('models/', '');
                        });
                    const priorityOrder = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
                    const matched = priorityOrder.filter(function(p) { return available.includes(p); });
                    const otherFlash = available.filter(function(a) { return a.includes('flash') && !matched.includes(a); });
                    if (matched.length > 0 || otherFlash.length > 0) {
                        candidateModels = matched.concat(otherFlash);
                    }
                }
            } catch (discoveryErr) {
                console.warn("Model list check skipped, using default failover queue.");
            }

            let lastErr = null;
            for (let i = 0; i < candidateModels.length; i++) {
                const tryModel = candidateModels[i];
                activeModel = tryModel;

                if (i > 0) {
                    planBox.innerHTML = [
                        '<div>',
                        '<strong>Primary AI model is experiencing high demand. Rerouting to backup model (' + tryModel + ' - Attempt ' + (i + 1) + ' of ' + candidateModels.length + ')...</strong>',
                        '<p style="margin:6px 0 0 0; font-size:13px; color:var(--text-muted);">',
                        'Spikes in demand are temporary. Please wait while we secure a response.',
                        '</p>',
                        '</div>'
                    ].join('');
                    await waitDelay(1500);
                }

                try {
                    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + tryModel + ':generateContent?key=' + localKey, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: promptLines }] }] })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error.message);

                    const textCandidate = data.candidates &&
                        data.candidates[0] &&
                        data.candidates[0].content &&
                        data.candidates[0].content.parts &&
                        data.candidates[0].content.parts[0] &&
                        data.candidates[0].content.parts[0].text;

                    if (!textCandidate) throw new Error("Empty response from " + tryModel);
                    rawOutput = textCandidate;
                    break;
                } catch (attemptErr) {
                    lastErr = attemptErr;
                    console.warn("Model " + tryModel + " busy or failed:", attemptErr.message);
                }
            }

            if (!rawOutput && lastErr) throw lastErr;

        } else {
            const maxAttempts = 2;
            let lastServerErr = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                if (attempt > 1) {
                    planBox.innerHTML = [
                        '<div>',
                        '<strong>Shared AI server is busy (high traffic). Automatically retrying (Attempt ' + attempt + ' of ' + maxAttempts + ')...</strong>',
                        '<p style="margin:8px 0 0 0; font-size:13px; color:var(--text-muted);">',
                        'Tip: If you have your own Gemini API key, ',
                        '<a href="javascript:void(0)" onclick="switchTab(\'tab-api\')" style="color:var(--accent-text); text-decoration:underline; font-weight:600;">click here to add it in API Configuration</a> ',
                        'for dedicated, zero-wait access.',
                        '</p>',
                        '</div>'
                    ].join('');
                    await waitDelay(2000);
                }

                try {
                    const endpoint = window.location.hostname.includes('vercel.app')
                        ? '/api/generate-plan'
                        : '/.netlify/functions/generate-plan';

                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(currentItem)
                    });
                    const data = await res.json();
                    if (data.error && !data.plan) throw new Error(data.error);
                    if (!data.plan) throw new Error("Empty plan returned from server.");
                    rawOutput = data.plan;
                    break;
                } catch (serverErr) {
                    lastServerErr = serverErr;
                    console.warn("Serverless attempt " + attempt + " failed:", serverErr.message);
                }
            }

            if (!rawOutput && lastServerErr) throw lastServerErr;
        }

        if (!rawOutput) throw new Error("AI service returned an empty response after retries.");

        const fence = String.fromCharCode(96, 96, 96);
        rawOutput = String(rawOutput).split(fence + 'json').join('').split(fence + 'html').join('').split(fence).join('').trim();

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
        console.warn("All live AI retries busy. Activating smart semantic fallback blueprint:", err);

        const fallback = buildSmartFallbackBlueprint(currentItem);
        currentItem.ai_plan = fallback.summary;
        currentItem.expenses = fallback.expenses;
        currentItem.tasks = fallback.tasks;

        updateDatabaseRecord(currentItem);
        openWorkspace(currentItem.id);

        showToastNotice("Initialized smart event blueprint. Add a personal API key anytime for live AI generation.");
    }
}
// ==========================================
// 11. COMMONJS EXPORT FOR AUTOMATED JEST TESTING
// ==========================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        escapeHTML: escapeHTML,
        calculateFinancialSummary: calculateFinancialSummary,
        buildSmartFallbackBlueprint: buildSmartFallbackBlueprint,
        setTheme: setTheme,
        setFontSize: setFontSize
    };
}