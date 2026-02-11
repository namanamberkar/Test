/**
 * Aikya Management App - Core Logic
 * Connects to Google Apps Script Backend
 */

// Replace this with your actual Google Apps Script Web App URL
const GAS_URL = 'YOUR_GAS_WEB_APP_URL';

// DOM Elements
const dashboardView = document.getElementById('dashboard-view');
const searchView = document.getElementById('search-view');
const guestSearch = document.getElementById('guest-search');
const refreshBtn = document.getElementById('refresh-data');
const statusBadge = document.getElementById('status-badge');
const navDashboard = document.getElementById('nav-dashboard');
const navSearch = document.getElementById('nav-search');

// Notification Elements
const enableNotificationsBtn = document.getElementById('enable-notifications');
const installBtn = document.getElementById('install-pwa');

// State
let dashboardData = null;
let deferredPrompt;

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    if (GAS_URL === 'YOUR_GAS_WEB_APP_URL') {
        alert('Please update the GAS_URL in app.js with your deployed Web App URL!');
    }
    fetchDashboard();
});

// ============================================
// NAVIGATION & UI
// ============================================

navDashboard.addEventListener('click', () => {
    showView('dashboard');
});

navSearch.addEventListener('click', () => {
    showView('search');
});

function showView(view) {
    if (view === 'dashboard') {
        dashboardView.style.display = 'block';
        searchView.style.display = 'none';
        navDashboard.classList.add('active');
        navSearch.classList.remove('active');
    } else {
        dashboardView.style.display = 'none';
        searchView.style.display = 'block';
        navDashboard.classList.remove('active');
        navSearch.classList.add('active');
    }
}

refreshBtn.addEventListener('click', fetchDashboard);

// ============================================
// DATA FETCHING
// ============================================

async function fetchDashboard() {
    if (!GAS_URL || GAS_URL.includes('YOUR_GAS')) return;

    statusBadge.textContent = 'Updating...';
    try {
        const response = await fetch(`${GAS_URL}?api=dashboard`);
        const data = await response.json();
        if (data.success) {
            dashboardData = data;
            updateDashboardUI();
            statusBadge.textContent = 'Updated just now';
        }
    } catch (error) {
        console.error('Fetch error:', error);
        statusBadge.textContent = 'Server Error';
    }
}

function updateDashboardUI() {
    const { today, tomorrow } = dashboardData;

    // Today's Stats
    document.getElementById('today-date').textContent = formatDate(today.date);
    document.getElementById('today-day').textContent = today.day;
    document.getElementById('today-in').textContent = today.summary.checkins;
    document.getElementById('today-out').textContent = today.summary.checkouts;
    document.getElementById('today-occ').textContent = today.summary.occupied;

    // Tomorrow's Stats
    document.getElementById('tomorrow-date').textContent = formatDate(tomorrow.date);
    document.getElementById('tomorrow-day').textContent = tomorrow.day;
    document.getElementById('tomorrow-in').textContent = tomorrow.summary.checkins;
    document.getElementById('tomorrow-out').textContent = tomorrow.summary.checkouts;

    // Lists
    renderBookingList('today-checkins-list', today.checkins, 'No arrivals');
    renderBookingList('today-checkouts-list', today.checkouts, 'No departures');
    renderBookingList('tomorrow-checkins-list', tomorrow.checkins, 'No expected arrivals');
    renderBookingList('tomorrow-checkouts-list', tomorrow.checkouts, 'No expected departures');
}

function renderBookingList(elementId, bookings, emptyMsg) {
    const container = document.getElementById(elementId);
    if (!bookings || bookings.length === 0) {
        container.innerHTML = `<p class="empty-state">${emptyMsg}</p>`;
        return;
    }

    container.innerHTML = bookings.map(b => `
        <div class="list-item">
            <span class="guest-name">${b.guestName}</span>
            <span class="prop-name">${b.property}</span>
        </div>
    `).join('');
}

// ============================================
// SEARCH LOGIC
// ============================================

let searchTimeout;
guestSearch.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length < 3) return;

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 500);
});

async function performSearch(query) {
    showView('search');
    const container = document.getElementById('search-results-list');
    container.innerHTML = '<p class="badge">Searching...</p>';

    try {
        const response = await fetch(`${GAS_URL}?api=search&guest=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success && data.results.length > 0) {
            container.innerHTML = data.results.map(b => `
                <div class="summary-card" style="margin-bottom: 12px;">
                    <div class="card-header">
                        <h3>${b.guestName}</h3>
                        <span class="day-label">${b.property}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-muted);">
                        <p>📍 Source: ${b.bookingSource || 'Direct'}</p>
                        <p>📅 ${b.checkInDate} to ${b.checkOutDate}</p>
                        <p>👥 ${b.noOfGuests} Guests | 💰 ${b.amountPaid || 'N/A'}</p>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="empty-state">No bookings found for that name.</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="empty-state">Error searching. Check console.</p>';
    }
}

// ============================================
// PWA & NOTIFICATIONS
// ============================================

// PWA Install
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') installBtn.style.display = 'none';
        deferredPrompt = null;
    }
});

// Notifications
enableNotificationsBtn.addEventListener('click', async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        const subscription = await subscribeUserToPush();
        if (subscription) {
            saveSubscriptionToGAS(subscription);
            enableNotificationsBtn.textContent = 'Alerts Active ✅';
            enableNotificationsBtn.disabled = true;
        }
    }
});

async function subscribeUserToPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        // You would normally need your public VAPID key here
        // For simple triggers, we'll store the endpoint in GAS
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'TODO_YOUR_VAPID_PUBLIC_KEY'
        });
        return subscription;
    } catch (err) {
        console.error('Subscription failed', err);
        return null;
    }
}

async function saveSubscriptionToGAS(sub) {
    const body = new URLSearchParams();
    body.append('api', 'subscribe');
    body.append('subscription', JSON.stringify(sub));
    body.append('userAgent', navigator.userAgent);

    await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
    });
}

// Utilities
function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = ("0" + (date.getMonth() + 1)).slice(-2);
    const d = ("0" + date.getDate()).slice(-2);
    return `${y}-${m}-${d}`;
}

