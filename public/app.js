const API_URL = 'http://localhost:3000/api';

// --- STATE MANAGEMENT ---
let token = localStorage.getItem('token');
let currentUser = null;
let currentSheetId = null;
let currentDate = new Date();
let habits = [];
let monthData = [];
let myLineChart = null; // Store chart instance

// --- DOM ELEMENTS ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authToggle = document.getElementById('auth-toggle');
const sheetList = document.getElementById('sheet-list');

// --- INITIALIZATION ---
if (token) {
    loadApp();
}

// --- AUTHENTICATION LOGIC (Restored) ---
let isLogin = true;

// Toggle between Login and Signup
authToggle.addEventListener('click', () => {
    isLogin = !isLogin;
    authTitle.innerText = isLogin ? 'Login' : 'Sign Up';
    authToggle.innerText = isLogin ? 'Need an account? Sign Up' : 'Have an account? Login';
});

// Handle Form Submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const endpoint = isLogin ? '/auth/login' : '/auth/signup';

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.msg || data.error);

        if (isLogin) {
            token = data.token;
            localStorage.setItem('token', token);
            loadApp();
        } else {
            alert('Account created! Please login.');
            // Switch back to login view
            isLogin = true;
            authTitle.innerText = 'Login';
            authToggle.innerText = 'Need an account? Sign Up';
        }
    } catch (err) {
        alert(err.message);
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    location.reload();
});

// --- MAIN APP LOGIC ---

async function loadApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
    
    // Decode user info for display
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    
    document.getElementById('user-display').innerText = `User: ${payload.email || 'Me'}`;
    
    await fetchSheets();
}

async function fetchSheets() {
    try {
        const res = await fetch(`${API_URL}/sheets`, { headers: { 'Authorization': token } });
        const sheets = await res.json();
        
        sheetList.innerHTML = '';
        sheets.forEach(sheet => {
            const li = document.createElement('li');
            li.innerText = sheet.name;
            li.onclick = () => loadSheet(sheet._id, sheet.name);
            sheetList.appendChild(li);
        });
    } catch (e) {
        console.error("Error fetching sheets:", e);
    }
}

document.getElementById('add-sheet-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-sheet-name').value;
    if (!name) return;
    await fetch(`${API_URL}/sheets`, {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    document.getElementById('new-sheet-name').value = '';
    fetchSheets();
});

// --- SHEET & DATA LOGIC ---

async function loadSheet(sheetId, sheetName) {
    currentSheetId = sheetId;
    document.getElementById('no-sheet-selected').style.display = 'none';
    document.getElementById('sheet-view').style.display = 'block';
    
    // Highlight sidebar
    Array.from(sheetList.children).forEach(li => {
        li.classList.toggle('active', li.innerText === sheetName);
    });

    await loadSheetData();
}

async function loadSheetData() {
    // 1. Fetch Habits
    const habitRes = await fetch(`${API_URL}/sheets/${currentSheetId}/habits`, { headers: { 'Authorization': token } });
    habits = await habitRes.json();

    // 2. Fetch Month Data
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dataRes = await fetch(`${API_URL}/sheets/${currentSheetId}/month/${year}/${month}`, { headers: { 'Authorization': token } });
    monthData = await dataRes.json();

    renderGrid();
}

// Add Habit
document.getElementById('add-habit-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-habit-name').value;
    if (!name) return;
    await fetch(`${API_URL}/sheets/${currentSheetId}/habits`, {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    document.getElementById('new-habit-name').value = '';
    loadSheetData();
});

// Date Navigation
document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    loadSheetData();
});
document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    loadSheetData();
});

// --- PINK THEME RENDER LOGIC ---

function renderGrid() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    
    document.getElementById('current-month-display').innerText = monthNames[month];

    const thead = document.getElementById('table-header');
    const tbody = document.getElementById('table-body');
    const tfoot = document.getElementById('table-footer');

    // 1. HEADER: Days of Week (M, T, W...)
    let daysRow = '<th>Habits</th>';
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dayName = weekDays[dateObj.getDay()];
        daysRow += `<th>${dayName}<br>${d}</th>`; 
    }
    thead.innerHTML = `<tr>${daysRow}</tr>`;

    // 2. HABIT ROWS
    tbody.innerHTML = '';
    let dailyDone = new Array(daysInMonth + 1).fill(0);
    let totalHabits = habits.length;

    habits.forEach(habit => {
        let rowHTML = `<td>${habit.name}</td>`;
        
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const record = monthData.find(r => r.date === dateStr);
            const isDone = record && record.completedHabits.includes(habit._id);
            
            // Count for stats
            if (isDone) dailyDone[d]++;

            const todayStr = new Date().toISOString().split('T')[0];
            const isFuture = dateStr > todayStr;
            const isLocked = isDone; 

            rowHTML += `
                <td>
                    <input type="checkbox" 
                        class="habit-check" 
                        data-date="${dateStr}" 
                        data-habit="${habit._id}" 
                        ${isDone ? 'checked' : ''} 
                        ${(isFuture || isLocked) ? 'disabled' : ''}
                    >
                </td>`;
        }
        tbody.innerHTML += `<tr>${rowHTML}</tr>`;
    });

    // 3. FOOTER: Visual Bars & Stats
    
    // Row A: The Visual Pink Bars
    let barRow = `<td class="bar-cell" style="vertical-align: middle;"><strong>Daily<br>Progress</strong></td>`;
    for (let d = 1; d <= daysInMonth; d++) {
        let count = dailyDone[d];
        let percent = totalHabits > 0 ? (count / totalHabits) * 100 : 0;
        barRow += `
            <td class="bar-cell">
                <div class="bar-visual" style="height: ${percent}%;"></div>
            </td>`;
    }

    // Row B: "Done" Count
    let doneRow = `<td class="stat-label">Done</td>`;
    for (let d = 1; d <= daysInMonth; d++) doneRow += `<td>${dailyDone[d]}</td>`;

    // Row C: "Total" Count
    let totalRow = `<td class="stat-label">Total</td>`;
    for (let d = 1; d <= daysInMonth; d++) totalRow += `<td>${totalHabits}</td>`;

    // Row D: "Left" Count
    let leftRow = `<td class="stat-label">Left</td>`;
    for (let d = 1; d <= daysInMonth; d++) leftRow += `<td>${totalHabits - dailyDone[d]}</td>`;

    // Row E: Save Buttons
    let actionRow = `<td>Action</td>`;
    for (let d = 1; d <= daysInMonth; d++) {
         const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
         const todayStr = new Date().toISOString().split('T')[0];
         const btnDisabled = dateStr > todayStr ? 'disabled' : '';
         actionRow += `<td class="save-btn-cell"><button class="save-btn" ${btnDisabled} onclick="saveDay('${dateStr}')">Save</button></td>`;
    }

    tfoot.innerHTML = `
        <tr class="stat-row" style="height: 100px;">${barRow}</tr>
        <tr class="stat-row">${doneRow}</tr>
        <tr class="stat-row">${totalRow}</tr>
        <tr class="stat-row">${leftRow}</tr>
        <tr>${actionRow}</tr>
    `;

    renderLineChart(dailyDone, totalHabits, daysInMonth);
}

// --- SAVE FUNCTION ---
window.saveDay = async (dateStr) => {
    const checkboxes = document.querySelectorAll(`input[data-date="${dateStr}"]:checked`);
    const completedHabitIds = Array.from(checkboxes).map(cb => cb.dataset.habit);

    try {
        const res = await fetch(`${API_URL}/records`, {
            method: 'POST',
            headers: { 'Authorization': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sheetId: currentSheetId,
                date: dateStr,
                completedHabitIds
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.msg);
        }

        loadSheetData(); // Refresh grid to lock boxes
    } catch (e) {
        alert(e.message);
    }
};

// --- PINK LINE CHART (Top of page) ---
function renderLineChart(dailyDone, totalHabits, daysInMonth) {
    const ctx = document.getElementById('lineChart').getContext('2d');
    const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);
    const data = dailyDone.slice(1).map(d => totalHabits > 0 ? (d / totalHabits) * 100 : 0);

    if (myLineChart) myLineChart.destroy();

    myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Consistency %',
                data: data,
                borderColor: '#ff66b2', // Pink Line
                backgroundColor: 'rgba(255, 102, 178, 0.2)',
                borderWidth: 2,
                tension: 0,
                pointBackgroundColor: '#ff66b2',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: '#eee' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}