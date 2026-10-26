const form = document.getElementById('create-event-form');
const eventsList = document.getElementById('events-list');

// Load events on startup
function loadEvents() {
    const events = JSON.parse(localStorage.getItem('events')) || [];
    eventsList.innerHTML = events.length === 0 ? '<p>No events found.</p>' : '';
    
    events.forEach(event => {
        const div = document.createElement('div');
        div.className = 'event-card';
        div.innerHTML = `
            <h3>${event.name} (${event.type})</h3>
            <p><strong>Date:</strong> ${event.date} | <strong>Location:</strong> ${event.location}</p>
            <p><strong>Guests:</strong> ${event.guests} | <strong>Budget:</strong> ₹${event.budget}</p>
        `;
        eventsList.appendChild(div);
    });
}

// Handle form submission
form.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent page reload
    
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
    
    form.reset(); // Clear form
    loadEvents(); // Refresh list
});

// Initial load
loadEvents();