document.addEventListener('DOMContentLoaded', () => {
    const habits = ['1 min plank', 'situps 50', 'pushups 20', '50 crunches', 'wakeup at 5'];
    const tableBody = document.getElementById('habitRows');

    // Populate rows based on design
    habits.forEach(habit => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="text-align: left;">${habit}</td>
            ${Array(9).fill('<td><input type="checkbox"></td>').join('')}
        `;
        tableBody.appendChild(row);
    });

    // Placeholder for "Today" highlight logic
    const today = new Date().getDate();
    console.log(`Tooglr initialized for day: ${today}`);
});