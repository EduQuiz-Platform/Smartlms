// Common UI and Logic
const UI = {
    renderStats(containerId, stats) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = `
            <div class="stats-grid">
                ${stats.map(s => `
                    <div class="stat-card">
                        <h4>${s.label}</h4>
                        <div class="value">${s.value}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    showNotification(message, type = 'info') {
        alert(message); // Placeholder for better UI toast
    }
};

// Global init for all dashboards
async function initDashboard(role) {
    const user = await SessionManager.getCurrentUser();
    if (!user || user.role !== role) {
        alert(`Please login as a ${role}`);
        window.location.href = 'index.html';
        return null;
    }

    // Initialize sidebar toggle
    const toggle = document.getElementById('sidebarToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                document.body.classList.toggle('sidebar-open');
            } else {
                document.body.classList.toggle('sidebar-collapsed');
            }
        });
    }

    // Close sidebar on navigation on mobile
    const navButtons = document.querySelectorAll('.nav-side button');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                document.body.classList.remove('sidebar-open');
            }
        });
    });

    return user;
}

// Register Service Worker (only on supported protocols like https or http://localhost)
if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'smartlms.vercel.app')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.log('Service Worker not registered', err));
    });
}

// Request notification permission
async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted');
        }
    }
}

// Global notification system
const NotificationManager = {
    async fetchNotifications() {
        const user = await SessionManager.getCurrentUser();
        if (!user) return [];
        const fresh = await SupabaseDB.getUser(user.email);
        return fresh?.notifications || [];
    },

    async markAllAsRead() {
        const user = await SessionManager.getCurrentUser();
        if (!user) return;
        const fresh = await SupabaseDB.getUser(user.email);
        const notifications = (fresh?.notifications || []).map(n => ({ ...n, read: true }));
        await SupabaseDB.saveUser({ ...fresh, notifications });
        this.updateUI();
    },

    async updateUI() {
        const notifications = await this.fetchNotifications();
        const unreadCount = notifications.filter(n => !n.read).length;
        
        const bell = document.getElementById('unreadCount');
        if (bell) {
            bell.textContent = unreadCount;
            bell.style.display = unreadCount > 0 ? 'flex' : 'none';
        }

        const list = document.getElementById('notifList');
        if (list) {
            list.innerHTML = `
                <div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center">
                    <strong>Notifications</strong>
                    <button class="button secondary" style="padding:2px 6px; font-size:10px" onclick="NotificationManager.markAllAsRead()">Mark all as read</button>
                </div>
                ${notifications.length === 0 ? '<div style="padding:20px; text-align:center; color:#666">No notifications</div>' : ''}
                ${notifications.slice().reverse().map(n => `
                    <div style="padding:10px; border-bottom:1px solid #f9f9f9; background:${n.read ? '#fff' : '#f0f4ff'}" onclick="${n.link ? `window.location.href='${n.link}'` : ''}">
                        <div style="font-weight:600; font-size:13px">${escapeHtml(n.title)}</div>
                        <div style="font-size:12px; color:#444">${escapeHtml(n.message)}</div>
                        <div style="font-size:10px; color:#999; margin-top:4px">${new Date(n.created_at).toLocaleString()}</div>
                    </div>
                `).join('')}
            `;
        }
        
        // Browser notification for new unread ones
        const lastCount = parseInt(sessionStorage.getItem('lastNotifCount') || '0');
        if (unreadCount > lastCount) {
            const latest = notifications[notifications.length - 1];
            this.sendBrowserNotification(latest.title, latest.message);
        }
        sessionStorage.setItem('lastNotifCount', unreadCount);
    },

    async sendBrowserNotification(title, body) {
        if (Notification.permission === 'granted') {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(title, {
                body: body,
                icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135665.png',
                badge: 'https://cdn-icons-png.flaticon.com/512/3135/3135665.png'
            });
        } else {
            console.log('Push: ', title, body);
        }
    },

    initPolling() {
        this.updateUI();
        setInterval(() => this.updateUI(), 30000); // Poll every 30s
        
        const bell = document.getElementById('notifBell');
        const list = document.getElementById('notifList');
        if (bell && list) {
            bell.addEventListener('click', (e) => {
                e.stopPropagation();
                list.classList.toggle('active');
            });
            document.addEventListener('click', () => list.classList.remove('active'));
            list.addEventListener('click', (e) => e.stopPropagation());
        }
    }
};
window.NotificationManager = NotificationManager;
