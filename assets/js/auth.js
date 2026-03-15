// Authentication Logic
const Auth = {
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async init() {
        // show maintenance banners with countdowns
        await this.updateMaintBanners();
        setInterval(() => this.updateMaintBanners(), 1000);
        this.showSection('landing');
    },

    // ---- Maintenance helpers ----
    async getMaintenance() {
        try {
            return await SupabaseDB.getMaintenance();
        } catch (error) {
            console.error('Error fetching maintenance:', error);
            return { enabled: false, schedules: [] };
        }
    },

    // ---- Section Switching ----
    showSection(id) {
        document.querySelectorAll('.container').forEach(c => c.style.display = 'none');
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    },

    showSignup(role) {
        document.getElementById('signup-title').innerText = role ? `Sign Up as ${role}` : 'Sign Up';
        document.getElementById('role').value = role || 'student';
        this.showSection('signup');
    },

    showLogin() { this.showSection('login'); },
    showReset() { this.showSection('reset'); },
    showNewPassword() { this.showSection('newPassword'); },

    // ---- Maintenance Banners ----
    mountMaintBanners() {
        return {
            landing: document.getElementById('maintBanner'),
            signup: document.getElementById('maintBannerSignup'),
            login: document.getElementById('maintBannerLogin'),
            reset: document.getElementById('maintBannerReset'),
        };
    },

    async updateMaintBanners() {
        const m = await this.getMaintenance();
        const b = this.mountMaintBanners();
        const banners = [b.landing, b.signup, b.login, b.reset];
        const showText = (el, text) => { 
            if (!el) return; 
            if (text) { 
                el.style.display = 'block'; 
                el.textContent = text; 
            } else { 
                el.style.display = 'none'; 
                el.textContent = ''; 
            } 
        };
        
        if (isActiveMaintenance(m)) {
            const until = getActiveMaintenanceEnd(m);
            const remain = Math.max(0, (until || Date.now()) - Date.now());
            const h = Math.floor(remain / 3600000);
            const mm = Math.floor((remain % 3600000) / 60000);
            const ss = Math.floor((remain % 60000) / 1000);
            const msg = `System maintenance ACTIVE — restores in ${h}h ${mm}m ${ss}s (until ${new Date(until || Date.now()).toLocaleString()})`;
            banners.forEach(el => showText(el, msg));
        } else {
            const up = getUpcomingMaintenance(m);
            if (up) {
                const remain = Math.max(0, new Date(up.startAt).getTime() - Date.now());
                const h = Math.floor(remain / 3600000);
                const mm = Math.floor((remain % 3600000) / 60000);
                const ss = Math.floor((remain % 60000) / 1000);
                const msg = `Upcoming system maintenance — starts in ${h}h ${mm}m ${ss}s (at ${new Date(up.startAt).toLocaleString()})`;
                banners.forEach(el => showText(el, msg));
            } else {
                banners.forEach(el => showText(el, null));
            }
        }
    },

    redirectByRole(role) {
        if (role === 'student') window.location.href = 'student.html';
        else if (role === 'teacher') window.location.href = 'teacher.html';
        else if (role === 'admin') window.location.href = 'admin.html';
    }
};

// Global helpers (accessible from onclick)
window.showSignup = (role) => Auth.showSignup(role);
window.showLogin = () => Auth.showLogin();
window.showReset = () => Auth.showReset();

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();

    // ---- Signup ----
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const m = await Auth.getMaintenance();
            if (isActiveMaintenance(m)) {
                const untilTs = getActiveMaintenanceEnd(m);
                const untilStr = untilTs ? new Date(untilTs).toLocaleString() : 'the scheduled end time';
                alert(`System is currently undergoing maintenance. Signups are disabled until ${untilStr}.`);
                return;
            }
            
            const fullName = (document.getElementById('fullName').value || '').trim();
            const email = normalizeEmail(document.getElementById('email').value);
            const phone = (document.getElementById('phone').value || '').trim();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirmPassword').value;
            const role = (document.getElementById('role').value || 'student');

            const errorEl = document.getElementById('signupError');
            errorEl.innerText = '';

            if (password !== confirm) {
                errorEl.innerText = 'Passwords do not match.';
                return;
            }
            if (!isStrongPassword(password)) {
                errorEl.innerText = 'Password must be at least 8 chars with letters and numbers.';
                return;
            }

            const existing = await SupabaseDB.getUser(email);
            if (existing) {
                errorEl.innerText = 'Account with this email already exists.';
                return;
            }

            const hashedPassword = await Auth.hashPassword(password);
            const user = {
                full_name: fullName,
                email,
                phone,
                password: hashedPassword,
                role,
                created_at: new Date().toISOString(),
                failed_attempts: 0,
                locked_until: null,
                lockouts: 0,
                flagged: false,
                reset_request: null,
                active: true,
                notifications: []
            };
            
            const savedUser = await SupabaseDB.saveUser(user);
            if (!savedUser) {
                errorEl.innerText = 'Failed to create account. Please try again.';
                return;
            }
            
            await SessionManager.setCurrentUser(savedUser);
            alert(`Welcome ${fullName}! Your ${role} account has been created.`);
            Auth.redirectByRole(role);
        });
    }

    // ---- Login ----
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = normalizeEmail(document.getElementById('loginEmail').value);
            const password = document.getElementById('loginPassword').value;
            const m = await Auth.getMaintenance();
            
            if (isActiveMaintenance(m)) {
                let isAdmin = false;
                try {
                    const user = await SupabaseDB.getUser(email);
                    isAdmin = !!(user && user.role === 'admin');
                } catch(_) {}
                if (!isAdmin) {
                    const untilTs = getActiveMaintenanceEnd(m);
                    alert(`System maintenance active. Only admin login allowed until ${new Date(untilTs).toLocaleString()}.`);
                    return;
                }
            }
            
            const user = await SupabaseDB.getUser(email);
            const emailErr = document.getElementById('loginEmailError');
            const passErr = document.getElementById('loginPasswordError');
            emailErr.innerText = '';
            passErr.innerText = '';

            if (!user) {
                emailErr.innerText = 'No account found with this email';
                return;
            }
            if (!user.active) {
                emailErr.innerText = 'Your account has been deactivated.';
                return;
            }
            if (user.flagged) {
                emailErr.innerText = 'Account flagged. Please contact support.';
                return;
            }
            if (isAccountLocked(user)) {
                const mins = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
                passErr.innerText = `Account is locked. Try again in ${mins} minutes`;
                return;
            }

            const hashedInput = await Auth.hashPassword(password);
            if (user.password !== hashedInput) {
                // If it's an old plain-text password and it matches, we allow it but should ideally update it
                if (user.password === password) {
                    user.password = hashedInput; // Auto-migrate to hash
                } else {
                    user.failed_attempts++;
                    if (user.failed_attempts >= 5) {
                        user.locked_until = new Date(Date.now() + 30 * 60000).toISOString();
                        user.failed_attempts = 0;
                        user.lockouts++;
                        if (user.lockouts >= 3) user.flagged = true;
                        passErr.innerText = 'Too many failed attempts. Account locked for 30 minutes';
                    } else {
                        passErr.innerText = `Invalid password. ${5 - user.failed_attempts} attempts remaining`;
                    }
                    await SupabaseDB.saveUser(user);
                    return;
                }
            }

            user.failed_attempts = 0;
            user.locked_until = null;
            await SupabaseDB.saveUser(user);
            await SessionManager.setCurrentUser(user);
            alert(`Welcome back ${user.full_name}!`);
            Auth.redirectByRole(user.role);
        });
    }

    // ---- Reset Request ----
    const resetForm = document.getElementById('resetForm');
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = normalizeEmail(document.getElementById('resetEmail').value);
            const user = await SupabaseDB.getUser(email);
            const err = document.getElementById('resetError');
            err.innerText = '';

            if (!user) {
                err.innerText = 'No account found';
                return;
            }

            const tempPassword = Math.random().toString(36).slice(-8);
            user.reset_request = {
                status: 'pending',
                temp_password: tempPassword,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString()
            };
            await SupabaseDB.saveUser(user);
            alert('Reset request submitted. Use temporary password once approved by admin.');
            Auth.showLogin();
        });
    }
});
