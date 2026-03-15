async function renderDashboard() {
  NotificationManager.initPolling();
  const users = await SupabaseDB.getUsers();
  const assignments = await SupabaseDB.getAssignments();
  const submissions = await SupabaseDB.getSubmissions();
  const maintenance = await SupabaseDB.getMaintenance();
  
  const stats = {
    totalUsers: users.length,
    students: users.filter(u => u.role === 'student').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    locked: users.filter(u => isAccountLocked(u)).length,
    flagged: users.filter(u => u.flagged).length,
    pendingResets: users.filter(u => u.reset_request && u.reset_request.status === 'pending').length,
    assignments: assignments.length,
    submissions: submissions.length,
    pendingGrading: submissions.filter(s => s.status === 'submitted').length,
    maintStatus: isActiveMaintenance(maintenance) ? 'Active' : 'Off'
  };
  
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card" style="margin-bottom:20px">
      <h3>Broadcast Notification</h3>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px">
        <input type="text" id="bcTitle" placeholder="Title" style="margin:0">
        <select id="bcRole" style="margin:0"><option value="all">All Users</option><option value="student">Students</option><option value="teacher">Teachers</option></select>
      </div>
      <textarea id="bcMsg" placeholder="Message content..." style="margin-top:10px" rows="2"></textarea>
      <button class="button" onclick="broadcastNotif()" style="margin-top:10px">Send Broadcast</button>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><h4>Total Users</h4><div class="value">${stats.totalUsers}</div></div>
      <div class="stat-card" style="border-left-color: var(--danger)"><h4>Locked Accounts</h4><div class="value">${stats.locked}</div></div>
      <div class="stat-card" style="border-left-color: var(--warn)"><h4>Flagged Accounts</h4><div class="value">${stats.flagged}</div></div>
      <div class="stat-card"><h4>Pending Resets</h4><div class="value">${stats.pendingResets}</div></div>
      <div class="stat-card"><h4>Assignments</h4><div class="value">${stats.assignments}</div></div>
      <div class="stat-card"><h4>Submissions</h4><div class="value">${stats.submissions}</div></div>
      <div class="stat-card"><h4>Pending Grading</h4><div class="value">${stats.pendingGrading}</div></div>
      <div class="stat-card" style="border-left-color: ${stats.maintStatus === 'Active' ? 'var(--warn)' : 'var(--ok)'}">
        <h4>Maintenance</h4><div class="value">${stats.maintStatus}</div>
      </div>
    </div>
    <section><h3>Recent Activity</h3><div style="color:var(--muted)">System running normally. All services operational.</div></section>
  `;
}
let allUsers = [];

async function renderUsers() {
  allUsers = await SupabaseDB.getUsers();
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <section>
      <h3>User Accounts</h3>
      <div class="controls-row">
        <input type="text" id="userSearch" class="search-input" placeholder="Search by name or email" oninput="filterUsers()">
        <select id="roleFilter" class="filter-select" onchange="filterUsers()">
          <option value="all">All Roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        <select id="statusFilter" class="filter-select" onchange="filterUsers()">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="flagged">Flagged</option>
          <option value="locked">Locked</option>
        </select>
        <button class="button export-btn" onclick="exportUsersCSV()">Export Users CSV</button>
      </div>
      <button class="button" onclick="showCreateUserForm()" style="margin-bottom:20px">Add User</button>
      
      <div id="usersList"></div>
    </section>
  `;
  displayUsers(allUsers);
}

function filterUsers() {
  const searchTerm = document.getElementById('userSearch').value.toLowerCase();
  const roleFilter = document.getElementById('roleFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;

  const filtered = allUsers.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm) || 
                          user.email.toLowerCase().includes(searchTerm);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') matchesStatus = user.active;
      else if (statusFilter === 'inactive') matchesStatus = !user.active;
      else if (statusFilter === 'flagged') matchesStatus = user.flagged;
      else if (statusFilter === 'locked') matchesStatus = isAccountLocked(user);
    }

    return matchesSearch && matchesRole && matchesStatus;
  });

  displayUsers(filtered);
}

function displayUsers(users) {
  const list = document.getElementById('usersList');
  if (!list) return;
  
  list.innerHTML = users.map(user => {
    const isLocked = isAccountLocked(user);
    const statusBadges = [];
    if (!user.active) statusBadges.push('<span class="badge badge-inactive">Inactive</span>');
    else statusBadges.push('<span class="badge badge-active">Active</span>');
    
    if (user.flagged) statusBadges.push('<span class="badge badge-flagged">Flagged</span>');
    if (isLocked) statusBadges.push('<span class="badge badge-locked">Locked</span>');

    return `
      <div class="user-card">
        <div class="user-header">
          <div class="user-title">
            ${escapeHtml(user.full_name)} <span class="user-role">(${user.role}) - ${escapeHtml(user.email)}</span>
          </div>
          <div style="display:flex; gap:5px">${statusBadges.join('')}</div>
        </div>
        <div class="user-meta">
          Phone: ${escapeHtml(user.phone || 'N/A')} | 
          Failed Attempts: ${user.failed_attempts || 0} | 
          Lockouts: ${user.lockouts || 0} | 
          Joined: ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
        </div>
        <div class="action-row">
          <button class="btn-sm btn-edit" onclick="editUser('${user.email}')">Edit</button>
          <button class="btn-sm btn-activate" onclick="toggleUserStatus('${user.email}', ${user.active})">
            ${user.active ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn-sm btn-delete" onclick="deleteUserByEmail('${user.email}')">Delete</button>
          <button class="btn-sm btn-lock" onclick="lockUser('${user.email}', 30)">Lock 30m</button>
          <button class="btn-sm btn-lock" onclick="lockUser('${user.email}', 1440)">Lock 24h</button>
          <button class="btn-sm btn-unlock" onclick="unlockUser('${user.email}')">Unlock</button>
          <button class="btn-sm ${user.flagged ? 'btn-unflag' : 'btn-flag'}" onclick="toggleUserFlag('${user.email}', ${user.flagged})">
            ${user.flagged ? 'Unflag' : 'Flag'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}
async function renderResets() {
  const users = await SupabaseDB.getUsers();
  const pendingResets = users.filter(u => u.reset_request && u.reset_request.status === 'pending');
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <section>
      <h3>Password Reset Requests</h3>
      ${pendingResets.length === 0 ? '<p>No pending reset requests.</p>' : `
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Requested At</th><th>Actions</th></tr></thead>
          <tbody>
            ${pendingResets.map(user => `
              <tr>
                <td>${escapeHtml(user.full_name)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${new Date(user.reset_request.created_at).toLocaleString()}</td>
                <td>
                  <button class="btn-sm btn-unlock" onclick="approveReset('${user.email}')">Approve</button>
                  <button class="btn-sm btn-delete" onclick="denyReset('${user.email}')">Deny</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </section>
  `;
}

async function approveReset(email) {
  const user = await SupabaseDB.getUser(email);
  if (user && user.reset_request) {
    user.reset_request.status = 'approved';
    if (await SupabaseDB.saveUser(user)) {
      alert('Reset request approved');
      renderResets();
    }
  }
}

async function denyReset(email) {
  const reason = prompt("Enter denial reason:");
  if (reason !== null) {
    const user = await SupabaseDB.getUser(email);
    if (user && user.reset_request) {
      user.reset_request.status = 'denied';
      user.reset_request.denial_reason = reason;
      if (await SupabaseDB.saveUser(user)) {
        alert('Reset request denied');
        renderResets();
      }
    }
  }
}

async function renderAnalytics() {
  const submissions = await SupabaseDB.getSubmissions();
  const users = await SupabaseDB.getUsers();
  const content = document.getElementById('pageContent');
  
  const submissionsByDate = {};
  submissions.forEach(s => {
    const date = new Date(s.submitted_at || Date.now()).toLocaleDateString();
    submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;
  });

  content.innerHTML = `
    <section>
      <h3>System Analytics</h3>
      <div class="stats-grid">
        <div class="stat-card"><h4>Submission Rate</h4><div class="value">${submissions.length}</div></div>
        <div class="stat-card"><h4>Active Users</h4><div class="value">${users.filter(u => u.active).length}</div></div>
      </div>
      <div style="margin-top:20px">
        <h4>Submission Activity</h4>
        <pre>${JSON.stringify(submissionsByDate, null, 2)}</pre>
      </div>
    </section>
  `;
}

async function renderMaintenance() {
  const maintenance = await SupabaseDB.getMaintenance();
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <section>
      <h3>Maintenance Settings</h3>
      <form id="maintenanceForm">
        <div><label><input type="checkbox" id="maintenanceEnabled" ${maintenance.enabled ? 'checked' : ''}> Enable Maintenance Mode</label></div>
        <div><label>Manual Until (optional):</label><input type="datetime-local" id="manualUntil" value="${maintenance.manual_until ? new Date(maintenance.manual_until).toISOString().slice(0, 16) : ''}"></div>
        <button type="submit">Save Settings</button>
      </form>
      <div style="margin-top:30px">
        <h4>Scheduled Maintenance</h4>
        <div id="schedulesList">
          ${(maintenance.schedules || []).map((schedule, idx) => `
            <div style="border:1px solid var(--border);padding:10px;margin:10px 0;border-radius:6px">
              <div>From: ${new Date(schedule.startAt).toLocaleString()}</div>
              <div>To: ${new Date(schedule.endAt).toLocaleString()}</div>
              <button onclick="removeSchedule(${idx})" style="margin-top:8px;padding:4px 8px;font-size:12px;background:#f56565">Remove</button>
            </div>
          `).join('')}
        </div>
        <button onclick="showAddScheduleForm()">+ Add Schedule</button>
      </div>
    </section>
  `;
  document.getElementById('maintenanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    maintenance.enabled = document.getElementById('maintenanceEnabled').checked;
    maintenance.manual_until = document.getElementById('manualUntil').value ? new Date(document.getElementById('manualUntil').value).toISOString() : null;
    if (await SupabaseDB.saveMaintenance(maintenance)) { alert('Saved!'); renderMaintenance(); }
  });
}
async function renderSystem() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <section>
      <h3>System Information</h3>
      <div style="display:grid;gap:15px">
        <div><h4>Database Status</h4><div style="color:var(--ok)">✅ Connected to Supabase</div></div>
        <div><h4>Application Version</h4><div>SmartLMS v1.1.0</div></div>
      </div>
    </section>
  `;
}
function showCreateUserForm() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <section>
      <h3>Create User</h3>
      <form id="createUserForm">
        <input type="text" id="fullName" placeholder="Full Name" required>
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Password" required>
        <select id="role"><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select>
        <label><input type="checkbox" id="active" checked> Active</label>
        <button type="submit">Create User</button>
        <button type="button" class="secondary" onclick="renderUsers()">Cancel</button>
      </form>
    </section>
  `;
  document.getElementById('createUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = { full_name: document.getElementById('fullName').value, email: document.getElementById('email').value, password: document.getElementById('password').value, role: document.getElementById('role').value, active: document.getElementById('active').checked, created_at: new Date().toISOString(), notifications: [] };
    if (await SupabaseDB.saveUser(user)) { alert('Created!'); renderUsers(); }
  });
}
async function editUser(email) {
  const user = allUsers.find(u => u.email === email);
  if (!user) return;
  const newName = prompt("Enter new full name:", user.full_name);
  if (newName !== null) {
    user.full_name = newName;
    if (await SupabaseDB.saveUser(user)) renderUsers();
  }
}

async function toggleUserStatus(email, currentStatus) {
  const user = allUsers.find(u => u.email === email);
  if (user) { 
    user.active = !currentStatus; 
    if (await SupabaseDB.saveUser(user)) renderUsers(); 
  }
}

async function deleteUserByEmail(email) {
  if (confirm(`Delete user ${email}?`)) { 
    try { 
      await SupabaseDB.deleteUser(email); 
      renderUsers(); 
    } catch(e) { 
      alert('Error deleting user'); 
    } 
  }
}

async function lockUser(email, minutes) {
  const user = allUsers.find(u => u.email === email);
  if (user) {
    user.locked_until = new Date(Date.now() + minutes * 60000).toISOString();
    if (await SupabaseDB.saveUser(user)) {
      alert(`User locked for ${minutes} minutes`);
      renderUsers();
    }
  }
}

async function unlockUser(email) {
  const user = allUsers.find(u => u.email === email);
  if (user) {
    user.locked_until = null;
    user.failed_attempts = 0;
    if (await SupabaseDB.saveUser(user)) {
      alert('User unlocked');
      renderUsers();
    }
  }
}

async function toggleUserFlag(email, currentFlag) {
  const user = allUsers.find(u => u.email === email);
  if (user) {
    user.flagged = !currentFlag;
    if (await SupabaseDB.saveUser(user)) {
      alert(user.flagged ? 'User flagged' : 'User unflagged');
      renderUsers();
    }
  }
}

function exportUsersCSV() {
  const headers = ['Full Name', 'Email', 'Role', 'Status', 'Lockouts', 'Joined'];
  const rows = allUsers.map(u => [
    u.full_name,
    u.email,
    u.role,
    u.active ? 'Active' : 'Inactive',
    u.lockouts || 0,
    u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'
  ]);
  
  let csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(",") + "\n"
    + rows.map(e => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "users_export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function showAddScheduleForm() {
  const content = document.getElementById('pageContent');
  const currentContent = content.innerHTML;
  content.innerHTML = currentContent + `
    <div class="card">
      <h4>Add Schedule</h4>
      <form id="scheduleForm">
        <input type="datetime-local" id="scheduleStart" required>
        <input type="datetime-local" id="scheduleEnd" required>
        <button type="submit">Add</button>
        <button type="button" class="secondary" onclick="renderMaintenance()">Cancel</button>
      </form>
    </div>
  `;
  document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const maintenance = await SupabaseDB.getMaintenance();
    maintenance.schedules = maintenance.schedules || [];
    maintenance.schedules.push({ startAt: new Date(document.getElementById('scheduleStart').value).toISOString(), endAt: new Date(document.getElementById('scheduleEnd').value).toISOString() });
    if (await SupabaseDB.saveMaintenance(maintenance)) renderMaintenance();
  });
}
function removeSchedule(index) {
  if (confirm('Remove?')) { SupabaseDB.getMaintenance().then(async m => { m.schedules.splice(index, 1); if (await SupabaseDB.saveMaintenance(m)) renderMaintenance(); }); }
}
document.querySelectorAll('#adminNav button').forEach(button => {
  button.addEventListener('click', (e) => {
    document.querySelectorAll('#adminNav button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    const page = button.dataset.page;
    if(page === 'dashboard') renderDashboard();
    else if(page === 'resets') renderResets();
    else if(page === 'users') renderUsers();
    else if(page === 'analytics') renderAnalytics();
    else if(page === 'maintenance') renderMaintenance();
  });
});
async function broadcastNotif() {
  const title = document.getElementById('bcTitle').value;
  const message = document.getElementById('bcMsg').value;
  const role = document.getElementById('bcRole').value;
  if (!title || !message) return alert('Fill title and message');
  
  // Call Edge Function
  const { data, error } = await supabaseClient.functions.invoke('notify', {
    body: { type: 'broadcast', payload: { role, title, message } }
  });
  
  if (error) alert('Error: ' + error.message);
  else alert('Broadcast sent to ' + (data.count || 0) + ' users');
}

document.getElementById('logoutBtn').addEventListener('click', async () => { await SessionManager.clearCurrentUser(); window.location.href = 'index.html'; });
