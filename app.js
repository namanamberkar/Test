/**
 * Aikya Management App - Core Logic
 * Connects to Google Apps Script Backend
 */

// Replace this with your actual Google Apps Script Web App URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyg_tQoVICg80QZfRmoqMHXaK4V7hTc3GXjIe4LgL06rm9mrHS8T3oWJB95BaoUQuhB/exec';

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

function renderBookingList(elementId, bookings, emptyMsg) {
    const container = document.getElementById(elementId);
    if (!bookings || bookings.length === 0) {
        container.innerHTML = `<p class="empty-state">${emptyMsg}</p>`;
        return;
    }

    container.innerHTML = bookings.map(b => `
        <div class="list-item clickable" onclick="copyBookingDetails('${b.guestName}', '${b.property}')">
            <span class="guest-name">${b.guestName}</span>
            <span class="prop-name">${b.property}</span>
            <span class="copy-icon">📋</span>
        </div>
    `).join('');
}

window.copyBookingDetails = function (name, property) {
    const text = `${name} - ${property}`;
    navigator.clipboard.writeText(text).then(() => {
        const badge = document.getElementById('status-badge');
        const originalText = badge.textContent;
        badge.textContent = 'Copied to clipboard! ✅';
        badge.style.color = 'var(--success)';
        setTimeout(() => {
            badge.textContent = originalText;
            badge.style.color = 'var(--text-muted)';
        }, 2000);
    });
};

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
    renderBookingList('today-checkins-list', today.checkins, 'No check-ins');
    renderBookingList('today-checkouts-list', today.checkouts, 'No check-outs');
    renderBookingList('tomorrow-checkins-list', tomorrow.checkins, 'No expected check-ins');
    renderBookingList('tomorrow-checkouts-list', tomorrow.checkouts, 'No expected check-outs');
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

        // IMPORTANT: For Push Notifications to work, you need a VAPID Public Key.
        // You can generate one for free at: https://vapidkeys.com/
        // Firebase Web Push Certificate (VAPID Public Key)
        const VAPID_PUBLIC_KEY = 'BLGG-f8Mv-j8NVYarhWScBDtz9LdE_zo2qXpuf0TGE8eZlHH-nuQ6DnqvBxzLmO3Yrdq2349Y_ZsHoFacdciVxo';

        if (VAPID_PUBLIC_KEY === 'BDE6l-R_Uo_v_Y_Z_X_W_v_T_X_v_S_v_X_v_S_v_X_v_S_v_X_v_S_v_X_v_S_v_X_v_S_v_X') {
            console.warn('Using default placeholder VAPID key. This may fail. Generate one at vapidkeys.com');
        }

        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

        // CRITICAL FIX: Unsubscribe existing (old) subscription to force new key usage
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
            console.log('Unsubscribing old token...');
            await existingSub.unsubscribe();
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
        });
        return subscription;
    } catch (err) {
        console.error('Subscription failed', err);
        alert('Notification setup failed: ' + err.message + '\n\nPlease ensure you have a valid VAPID_PUBLIC_KEY in app.js');
        return null;
    }
}

// Helper function for VAPID key conversion
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
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

