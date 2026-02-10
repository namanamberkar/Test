// Supabase Configuration - IMPORTANT: User will need to provide their own keys
// I will provide a placeholder and instructions on how to set it up.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const notificationBtn = document.getElementById('enable-notifications');

// Update button state based on permission
function updateNotificationButton() {
    if (!('Notification' in window)) {
        notificationBtn.textContent = 'Not Supported';
        notificationBtn.disabled = true;
        return;
    }

    if (Notification.permission === 'granted') {
        notificationBtn.textContent = 'Notifications Enabled';
        notificationBtn.classList.add('enabled');
        notificationBtn.disabled = true;
    } else if (Notification.permission === 'denied') {
        notificationBtn.textContent = 'Blocked by Browser';
        notificationBtn.disabled = true;
    }
}

// Request Permission
notificationBtn.addEventListener('click', async () => {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            new Notification('StaffChat', {
                body: 'Push notifications are now enabled!',
                icon: '/icons/icon-192.png'
            });
            updateNotificationButton();
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
    }
});

// Initial check
updateNotificationButton();

// App State
let currentStaff = null;
let currentUser = { id: 'staff-1', name: 'Me' }; // Mock logged in user

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const currentChatName = document.getElementById('current-chat-name');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

function selectStaff(staff) {
    currentStaff = staff;
    currentChatName.textContent = `Chatting with ${staff.name}`;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.placeholder = "Type a message...";

    // Clear messages and load history (mock)
    chatMessages.innerHTML = `
        <div class="welcome-screen">
            <p>Direct message history with ${staff.name} will appear here.</p>
        </div>
    `;
}

// Mock Staff List with interactive selection
const dummyStaff = [
    { id: 'staff-2', name: 'Naman Aruna', status: 'Online' },
    { id: 'staff-3', name: 'Jane Doe', status: 'Away' },
    { id: 'staff-4', name: 'John Smith', status: 'Offline' }
];

function renderStaff() {
    staffList.innerHTML = dummyStaff.map(staff => `
        <div class="staff-item" id="${staff.id}">
            <div class="staff-info">
                <div class="staff-name">${staff.name}</div>
                <div class="staff-status ${staff.status.toLowerCase()}">${staff.status}</div>
            </div>
        </div>
    `).join('');

    // Add click listeners
    dummyStaff.forEach(staff => {
        document.getElementById(staff.id).addEventListener('click', () => selectStaff(staff));
    });
}

// Message Sending
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();
    if (!content || !currentStaff) return;

    // UI Feedback: Add message immediately
    addMessageToUI('Me', content, 'sent');
    messageInput.value = '';

    // Real-time: This is where we'd push to Supabase
    /*
    const { error } = await supabase
        .from('messages')
        .insert([{ content, sender_id: currentUser.id, receiver_id: currentStaff.id }]);
    */
});

function addMessageToUI(sender, content, type) {
    const welcome = chatMessages.querySelector('.welcome-screen');
    if (welcome) welcome.remove();

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.innerHTML = `
        <div class="message-content">${content}</div>
        <div class="message-meta">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

renderStaff();
