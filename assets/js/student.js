async function updateMaintBanner(){ 
  const m = await SupabaseDB.getMaintenance(); 
  const b=document.getElementById('maintBanner'); 
  if(!b) return; 
  if(isActiveMaintenance(m)){ 
    const until=getActiveMaintenanceEnd(m); 
    const remain=Math.max(0,(until||Date.now())-Date.now()); 
    const h=Math.floor(remain/3600000), mm=Math.floor((remain%3600000)/60000), ss=Math.floor((remain%60000)/1000); 
    b.style.display='block'; 
    b.textContent=`System maintenance ACTIVE — restores in ${h}h ${mm}m ${ss}s (until ${new Date(until||Date.now()).toLocaleString()})`; 
    try { 
      const me=await SessionManager.getCurrentUser(); 
      if(me && me.role!=='admin'){ await SessionManager.clearCurrentUser(); window.location.href='index.html'; return; } 
    } catch(_){} 
  } else { 
    const up=getUpcomingMaintenance(m); 
    if(up){ 
      const remain=Math.max(0, up.startAt - Date.now()); 
      const h=Math.floor(remain/3600000), mm=Math.floor((remain%3600000)/60000), ss=Math.floor((remain%60000)/1000); 
      b.style.display='block'; 
      b.textContent=`Upcoming system maintenance — starts in ${h}h ${mm}m ${ss}s (at ${new Date(up.startAt).toLocaleString()})`; 
    } else { b.style.display='none'; } 
  } 
}
async function updateHeaderStats() {
  const me = await SessionManager.getCurrentUser();
  if (!me) return;
  const user = await SupabaseDB.getUser(me.email);
  const enrollments = await SupabaseDB.getEnrollments(user.email);
  const assigns = await SupabaseDB.getAssignments();
  const submissions = await SupabaseDB.getSubmissions(null, user.email);
  const badges = await SupabaseDB.getUserBadges(user.email);
  
  const enrolledCourseIds = enrollments.map(e => e.course_id);
  const now = Date.now();
  const dueSoon = assigns.filter(a => {
    const isEnrolled = enrolledCourseIds.includes(a.course_id);
    const dueDate = new Date(a.due_date).getTime();
    const isSubmitted = submissions.some(s => s.assignment_id === a.id);
    return isEnrolled && a.status === 'published' && !isSubmitted && dueDate > now && (dueDate - now) < (7 * 24 * 60 * 60 * 1000);
  });
  document.getElementById('statCourses').textContent = enrollments.length;
  document.getElementById('statDue').textContent = dueSoon.length;
  document.getElementById('statLevel').textContent = user.level || 1;
  document.getElementById('statBadges').textContent = badges.length;
  document.getElementById('profileName').textContent = user.full_name || 'Student';
}

async function renderCourses() {
  await updateHeaderStats();
  const user = await SessionManager.getCurrentUser();
  const courses = await SupabaseDB.getCourses();
  const enrollments = await SupabaseDB.getEnrollments(user.email);
  const publishedCourses = courses.filter(c => c.status === 'published');
  const container = document.getElementById('pageContent');
  container.innerHTML = '<h2>Available Courses</h2><div class="grid"></div>';
  const grid = container.querySelector('.grid');
  if (!publishedCourses.length) { grid.innerHTML = '<div class="empty">No courses available.</div>'; return; }
  publishedCourses.forEach(c => {
    const enrolled = enrollments.some(e => e.course_id === c.id);
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `
      <h3>${escapeHtml(c.title)}</h3>
      <p class="small">${escapeHtml(c.description || '')}</p>
      <div style="margin-top:10px">
        ${enrolled ? `<button class="button" onclick="viewCourse('${c.id}')">View Lessons</button>` : `<button class="button" onclick="enroll('${c.id}')">Enroll Now</button>`}
      </div>`;
    grid.appendChild(card);
  });
}
async function enroll(courseId) {
  const user = await SessionManager.getCurrentUser();
  await SupabaseDB.saveEnrollment({ course_id: courseId, student_email: user.email });
  alert('Successfully enrolled!'); renderCourses();
}
async function viewCourse(courseId) {
  const lessons = await SupabaseDB.getLessons(courseId);
  const assignments = await SupabaseDB.getAssignments();
  const courseAssignments = assignments.filter(a => a.course_id === courseId && a.status === 'published');
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <button class="button" onclick="renderCourses()" style="margin-bottom:15px">← Back to Courses</button>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <section class="card"><h3>Lessons</h3>${lessons.map(l => `<div class="question" style="cursor:pointer" onclick="showLesson('${l.id}', '${courseId}')"><strong>${escapeHtml(l.title)}</strong></div>`).join('') || '<p class="small">No lessons yet.</p>'}</section>
      <section class="card"><h3>Course Assignments</h3>${courseAssignments.map(a => `<div class="question"><strong>${escapeHtml(a.title)}</strong><p class="small">Due: ${new Date(a.due_date).toLocaleString()}</p><button class="button" onclick="renderAssignments()" style="padding:4px 8px;font-size:12px">Go to Assignments</button></div>`).join('') || '<p class="small">No assignments yet.</p>'}</section>
    </div>`;
}
async function showLesson(lessonId, courseId) {
  const lessons = await SupabaseDB.getLessons(courseId);
  const lesson = lessons.find(l => l.id === lessonId);
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <button class="button" onclick="viewCourse('${courseId}')" style="margin-bottom:15px">← Back to Lessons</button>
    <div class="card"><h2>${escapeHtml(lesson.title)}</h2><div style="margin-top:20px;line-height:1.6">${escapeHtml(lesson.content).replace(/\n/g, '<br>')}</div></div>`;
}
async function renderAssignments(){
  await updateHeaderStats();
  const user = await SessionManager.getCurrentUser();
  if(!user || user.role!=='student'){ alert('Login as student'); window.location.href='index.html'; return; }
  
  const courses = await SupabaseDB.getCourses();
  const enrollments = await SupabaseDB.getEnrollments(user.email);
  const enrolledCourseIds = enrollments.map(e => e.course_id);
  const assigns = await SupabaseDB.getAssignments();
  const submissions = await SupabaseDB.getSubmissions(null, user.email);
  const mine = assigns.filter(a => enrolledCourseIds.includes(a.course_id) && a.status === 'published');

  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <div class="card" style="padding:0; overflow-x:auto">
      <table>
        <thead>
          <tr>
            <th>Assignment</th>
            <th>Course</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Grade</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="assignTableBody"></tbody>
      </table>
    </div>
    <div id="assignmentForm" style="display:none; margin-top:20px"></div>
  `;

  const tbody = document.getElementById('assignTableBody');
  if(!mine.length){ tbody.innerHTML = '<tr><td colspan="6" class="empty">No assignments found.</td></tr>'; return; }

  const now = Date.now();
  mine.forEach(a => {
    const submission = submissions.find(s => s.assignment_id === a.id);
    const course = courses.find(c => c.id === a.course_id);
    const dueDate = new Date(a.due_date);
    const isOverdue = dueDate.getTime() < now && (!submission || submission.status === 'draft');

    let statusHtml = '';
    let actionsHtml = '';
    let gradeHtml = '-';

    if (submission) {
      if (submission.status === 'graded') {
        statusHtml = `<span class="badge badge-submitted">Submitted</span>`;
        const letter = getLetterGrade(submission.grade);
        gradeHtml = `<div class="grade-text">${letter} (${submission.grade}%)</div>`;
        actionsHtml = `
          <button class="btn-sm-action btn-feedback" onclick="viewFeedback('${a.id}')">💬 Feedback</button>
          <button class="btn-sm-action btn-download" onclick="alert('Downloading...')">📥 Download</button>
        `;
      } else if (submission.status === 'submitted') {
        statusHtml = `<span class="badge badge-submitted">Submitted</span>`;
        actionsHtml = `<button class="btn-sm-action btn-feedback" onclick="viewFeedback('${a.id}')">💬 Feedback</button>`;
      } else { // draft / in progress
        statusHtml = `<span class="badge badge-in-progress">In Progress</span>`;
        actionsHtml = `
          <button class="btn-sm-action btn-continue" onclick="showAssignmentForm('${a.id}')">📝 Continue</button>
          <button class="btn-sm-action btn-submit" onclick="submitAssignment('${a.id}', '${user.email}')">📤 Submit</button>
        `;
      }
    } else if (isOverdue) {
      statusHtml = `<span class="badge badge-inactive">Overdue</span>`;
      actionsHtml = `<button class="btn-sm-action btn-submit-now" onclick="showAssignmentForm('${a.id}')">📤 Submit Now</button>`;
    } else {
      statusHtml = `<span class="badge badge-not-started">Not Started</span>`;
      actionsHtml = `
        <button class="btn-sm-action btn-start" onclick="showAssignmentForm('${a.id}')">▶ Start</button>
        <button class="btn-sm-action btn-instructions" onclick="alert('Instructions: ...')">ℹ Instructions</button>
      `;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="assignment-title-cell">
          <img src="https://cdn-icons-png.flaticon.com/512/3522/3522602.png" class="assignment-icon" alt="Assignment">
          <div>
            <div class="assignment-title">${escapeHtml(a.title)}</div>
            <div class="assignment-subtitle">${escapeHtml(a.description || '').substring(0, 50)}...</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(course?.title || 'Unknown')}</td>
      <td>
        <div class="${isOverdue ? 'danger-text' : ''}">${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        ${isOverdue ? '<div class="small danger-text">(Overdue)</div>' : ''}
      </td>
      <td>${statusHtml}</td>
      <td>${gradeHtml}</td>
      <td><div class="actions-cell">${actionsHtml}</div></td>
    `;
    tbody.appendChild(row);
  });
}

async function showAssignmentForm(assignmentId) {
  const user = await SessionManager.getCurrentUser();
  const assigns = await SupabaseDB.getAssignments();
  const a = assigns.find(x => x.id === assignmentId);
  const submissions = await SupabaseDB.getSubmissions(null, user.email);
  const submission = submissions.find(s => s.assignment_id === a.id);

  const formWrap = document.getElementById('assignmentForm');
  formWrap.style.display = 'block';
  formWrap.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between">
        <h3>Submit: ${escapeHtml(a.title)}</h3>
        <button class="button secondary" onclick="document.getElementById('assignmentForm').style.display='none'">Close</button>
      </div>
      <div id="qwrap-${a.id}"></div>
      <div style="margin-top:20px; display:flex; gap:10px">
        <button class="button" onclick="submitAssignment('${a.id}', '${user.email}')">Submit Assignment</button>
        ${submission ? `<button class="button" style="background:var(--danger)" onclick="deleteSubmissionById('${a.id}', '${user.email}')">Delete Submission</button>` : ''}
      </div>
    </div>
  `;

  const qwrap = formWrap.querySelector(`#qwrap-${a.id}`);
  (a.questions || []).forEach((q, idx) => {
    const qDiv = document.createElement('div'); qDiv.className = 'question';
    const answer = submission?.answers?.[idx] || '';
    let inputHtml = '';
    if (q.type === 'essay') {
      inputHtml = `<textarea class="input" rows="6" placeholder="Your answer" data-q-idx="${idx}">${escapeHtml(answer)}</textarea>`;
    } else if (q.type === 'file') {
      inputHtml = `<div class="small">Upload File:</div><input type="file" class="input q-file" data-q-idx="${idx}"><p class="small">Current: ${escapeHtml(answer || 'None')}</p>`;
    } else if (q.type === 'link') {
      inputHtml = `<div class="small">Submission Link:</div><input type="url" class="input q-link" placeholder="https://..." data-q-idx="${idx}" value="${escapeHtml(answer)}">`;
    }
    qDiv.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
        <strong>Q${idx + 1}. ${escapeHtml(q.text || '')}</strong>
        <span class="small">${q.points || 0} pts</span>
      </div>
      ${inputHtml}
    `;
    qwrap.appendChild(qDiv);
  });
  formWrap.scrollIntoView({ behavior: 'smooth' });
}

async function viewFeedback(assignmentId) {
  const user = await SessionManager.getCurrentUser();
  const submission = await SupabaseDB.getSubmission(assignmentId, user.email);
  alert(`Grade: ${submission.grade}%\n\nFeedback: ${submission.feedback || 'No feedback provided.'}`);
}

async function renderAchievements() {
  const user = await SessionManager.getCurrentUser();
  const badges = await SupabaseDB.getUserBadges(user.email);
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <h2>My Achievements</h2>
    <div class="grid">
      ${badges.map(b => `
        <div class="card" style="text-align:center">
          <div style="font-size:40px; margin-bottom:10px">${b.badges.icon_url || '🏆'}</div>
          <h3>${escapeHtml(b.badges.title)}</h3>
          <p class="small">${escapeHtml(b.badges.description)}</p>
          <div class="small" style="margin-top:10px">Awarded on: ${new Date(b.awarded_at).toLocaleDateString()}</div>
        </div>
      `).join('') || '<div class="empty">No badges earned yet. Keep learning!</div>'}
    </div>
  `;
}

async function renderDashboardOverview() {
  NotificationManager.initPolling();
  await updateHeaderStats();
  const user = await SessionManager.getCurrentUser();
  const enrollments = await SupabaseDB.getEnrollments(user.email);
  const submissions = await SupabaseDB.getSubmissions(null, user.email);
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <h2>Welcome Back, ${escapeHtml(user.full_name)}!</h2>
    <div class="stats-grid">
      <div class="stat-card"><h4>Enrolled Courses</h4><div class="value">${enrollments.length}</div></div>
      <div class="stat-card"><h4>Completed Assignments</h4><div class="value">${submissions.filter(s => s.status === 'graded').length}</div></div>
      <div class="stat-card"><h4>Current XP</h4><div class="value">${user.xp || 0}</div></div>
    </div>
    <div class="card">
      <h3>Recent Activity</h3>
      <p class="small">You have ${enrollments.length} active courses. Check your assignments to stay on track!</p>
    </div>
  `;
}

async function renderProgress() {
  const user = await SessionManager.getCurrentUser();
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <h2>My Progress</h2>
    <div class="card">
      <h3>Level ${user.level || 1}</h3>
      <div style="background:#eee; height:20px; border-radius:10px; margin:10px 0; overflow:hidden">
        <div style="background:var(--ok); height:100%; width:${(user.xp % 100)}%"></div>
      </div>
      <p class="small">${user.xp % 100} / 100 XP to next level</p>
    </div>
  `;
}

async function renderGrades() {
  const user = await SessionManager.getCurrentUser();
  const submissions = await SupabaseDB.getSubmissions(null, user.email);
  const graded = submissions.filter(s => s.status === 'graded');
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <h2>My Grades</h2>
    <div class="card" style="padding:0">
      <table>
        <thead><tr><th>Assignment</th><th>Grade</th><th>Feedback</th></tr></thead>
        <tbody>
          ${graded.map(s => `<tr><td>${s.assignment_id}</td><td>${s.grade}%</td><td>${escapeHtml(s.feedback)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">No graded assignments yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

async function renderCalendar() {
  document.getElementById('pageContent').innerHTML = '<h2>Calendar</h2><div class="card"><p>Calendar view is coming soon.</p></div>';
}

async function renderMaterials() {
  document.getElementById('pageContent').innerHTML = '<h2>Course Materials</h2><div class="card"><p>Materials shared by your teachers will appear here.</p></div>';
}

async function renderDiscussions() {
  const user = await SessionManager.getCurrentUser();
  const enrollments = await SupabaseDB.getEnrollments(user.email);
  const courses = await SupabaseDB.getCourses();
  const myCourses = courses.filter(c => enrollments.some(e => e.course_id === c.id));
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <h2>Discussions</h2>
    <div class="grid">
      ${myCourses.map(c => `
        <div class="card">
          <h3>${escapeHtml(c.title)}</h3>
          <button class="button" onclick="viewStudentDiscussions('${c.id}')">View Discussion</button>
        </div>
      `).join('') || '<div class="empty">Enroll in a course to join discussions.</div>'}
    </div>
  `;
}

async function viewStudentDiscussions(courseId) {
  const user = await SessionManager.getCurrentUser();
  const disc = await SupabaseDB.getDiscussions(courseId);
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <button class="button" onclick="renderDiscussions()">← Back</button>
    <div class="card">
      <h3>Course Discussion</h3>
      <div id="disc-list" style="margin-bottom:20px; max-height:400px; overflow-y:auto">
        ${disc.map(d => `
          <div class="question" style="margin-bottom:10px">
            <div class="small"><strong>${escapeHtml(d.user_email)}</strong> - ${new Date(d.created_at).toLocaleString()}</div>
            <div style="margin-top:5px">${escapeHtml(d.content)}</div>
          </div>
        `).join('') || '<p class="small">No messages yet. Start the conversation!</p>'}
      </div>
      <div style="display:flex; gap:10px">
        <input type="text" id="discInput" placeholder="Write a message..." style="margin:0">
        <button class="button" onclick="postDiscussion('${courseId}')">Post</button>
      </div>
    </div>
  `;
}

async function postDiscussion(courseId) {
  const user = await SessionManager.getCurrentUser();
  const content = document.getElementById('discInput').value;
  if (!content) return;
  await SupabaseDB.saveDiscussion({ course_id: courseId, user_email: user.email, content });
  viewStudentDiscussions(courseId);
}

async function renderCertificates() {
  const user = await SessionManager.getCurrentUser();
  const certs = await SupabaseDB.getCertificates(user.email);
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <h2>My Certificates</h2>
    <div class="grid">
      ${certs.map(c => `
        <div class="card" style="text-align:center">
          <div style="font-size:40px">📜</div>
          <h3>${escapeHtml(c.courses.title)}</h3>
          <p class="small">Issued on: ${new Date(c.issued_at).toLocaleDateString()}</p>
          <a href="${c.certificate_url}" class="button" style="margin-top:10px" target="_blank">View Certificate</a>
        </div>
      `).join('') || '<div class="empty">No certificates earned yet. Finish a course to get one!</div>'}
    </div>
  `;
}

async function renderPlanner() {
  const user = await SessionManager.getCurrentUser();
  const items = await SupabaseDB.getPlannerItems(user.email);
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <h2>Study Planner</h2>
    <div class="card">
      <div style="display:flex; gap:10px; margin-bottom:20px">
        <input type="text" id="plannerTitle" placeholder="Task title..." style="margin:0">
        <input type="date" id="plannerDate" style="margin:0">
        <button class="button" onclick="addPlannerItem()">Add Task</button>
      </div>
      <div id="plannerList">
        ${items.map(item => `
          <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee">
            <span>${item.completed ? '✅' : '⏳'} ${escapeHtml(item.title)} - ${new Date(item.due_date).toLocaleDateString()}</span>
            <button class="button" style="padding:4px 8px; font-size:12px; background:var(--danger)" onclick="deletePlannerItem('${item.id}')">Delete</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function addPlannerItem() {
  const user = await SessionManager.getCurrentUser();
  const title = document.getElementById('plannerTitle').value;
  const date = document.getElementById('plannerDate').value;
  if (!title || !date) return;
  await SupabaseDB.savePlannerItem({ user_email: user.email, title, due_date: date, completed: false });
  renderPlanner();
}

async function deletePlannerItem(id) {
  await SupabaseDB.deletePlannerItem(id);
  renderPlanner();
}

async function renderHelp() {
  document.getElementById('pageContent').innerHTML = '<h2>Help & Support</h2><div class="card"><h3>FAQ</h3><p>Contact support at support@smartlms.com</p></div>';
}

async function renderQuizzes() {
  await updateHeaderStats();
  const user = await SessionManager.getCurrentUser();
  const enrollments = await SupabaseDB.getEnrollments(user.email);
  const enrolledCourseIds = enrollments.map(e => e.course_id);
  const quizzes = (await SupabaseDB.getQuizzes()).filter(q => enrolledCourseIds.includes(q.course_id) && q.status === 'published');
  const subs = await SupabaseDB.getQuizSubmissions(null, user.email);

  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <h2>My Quizzes</h2>
    <div class="card" style="padding:0">
      <table>
        <thead><tr><th>Quiz</th><th>Attempts</th><th>Best Score</th><th>Action</th></tr></thead>
        <tbody>
          ${quizzes.map(q => {
            const mySubs = subs.filter(s => s.quiz_id === q.id && s.status === 'submitted');
            const bestScore = mySubs.length ? Math.max(...mySubs.map(s => s.score || 0)) : '-';
            const attemptsUsed = mySubs.length;
            const canAttempt = attemptsUsed < q.attempts_allowed;
            return `
              <tr>
                <td><strong>${escapeHtml(q.title)}</strong><br><span class="small">${escapeHtml(q.description || '')}</span></td>
                <td>${attemptsUsed} / ${q.attempts_allowed}</td>
                <td>${bestScore !== '-' ? bestScore + '%' : '-'}</td>
                <td>
                  ${canAttempt ? `<button class="button" onclick="startQuiz('${q.id}')">Start Quiz</button>` : '<span class="badge badge-inactive">No Attempts Left</span>'}
                  ${attemptsUsed > 0 ? `<button class="button secondary" onclick="viewQuizResults('${q.id}')">View Details</button>` : ''}
                </td>
              </tr>
            `;
          }).join('') || '<tr><td colspan="4" class="empty">No quizzes available for your courses.</td></tr>'}
        </tbody>
      </table>
    </div>
    <div id="quizArea" style="display:none; margin-top:20px"></div>
  `;
}

let quizTimer = null;
let currentQuiz = null;
let currentSubmissionId = null;

async function startQuiz(quizId) {
  const user = await SessionManager.getCurrentUser();
  const quiz = await SupabaseDB.getQuiz(quizId);
  currentQuiz = quiz;

  const content = document.getElementById('pageContent');
  const card = content.querySelector('.card');
  if (card) card.style.display = 'none';
  const quizArea = document.getElementById('quizArea');
  quizArea.style.display = 'block';
  quizArea.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; sticky-top:0; background:#fff; z-index:10; padding:10px 0; border-bottom:1px solid #eee">
        <h3>${escapeHtml(quiz.title)}</h3>
        <div id="quizTimerDisplay" style="font-weight:bold; font-size:1.2rem; color:var(--danger)">Time Remaining: --:--</div>
      </div>
      <form id="quizForm">
        <div id="quizQuestions"></div>
        <div style="margin-top:20px; display:flex; gap:10px">
          <button type="button" class="button" onclick="submitQuiz()">Submit Quiz</button>
        </div>
      </form>
    </div>
  `;

  const qList = quizArea.querySelector('#quizQuestions');
  quiz.questions.forEach((q, idx) => {
    const qDiv = document.createElement('div'); qDiv.className = 'question';
    qDiv.style.marginBottom = '20px';
    let inputHtml = '';
    if (q.type === 'mcq') {
      inputHtml = q.options.map((opt, i) => `
        <div style="margin:5px 0">
          <label><input type="radio" name="q-${idx}" value="${i}" onchange="autoSaveQuiz()"> ${escapeHtml(opt)}</label>
        </div>
      `).join('');
    } else if (q.type === 'tf') {
      inputHtml = `
        <label><input type="radio" name="q-${idx}" value="True" onchange="autoSaveQuiz()"> True</label>
        <label style="margin-left:20px"><input type="radio" name="q-${idx}" value="False" onchange="autoSaveQuiz()"> False</label>
      `;
    } else if (q.type === 'short' || q.type === 'url') {
      inputHtml = `<input type="text" class="input" placeholder="Your answer..." oninput="autoSaveQuiz()" data-q-idx="${idx}">`;
    }

    qDiv.innerHTML = `
      <div style="font-weight:bold; margin-bottom:10px">Q${idx + 1}: ${escapeHtml(q.text)} (${q.points} pts)</div>
      ${q.hint ? `<div class="small" style="background:#fff4c2; padding:5px; margin-bottom:10px">💡 Hint: ${escapeHtml(q.hint)}</div>` : ''}
      ${inputHtml}
    `;
    qList.appendChild(qDiv);
  });

  // Create initial draft submission
  const sub = await SupabaseDB.saveQuizSubmission({
    quiz_id: quizId,
    student_email: user.email,
    status: 'draft',
    answers: {},
    started_at: new Date().toISOString()
  });
  currentSubmissionId = sub?.id;

  // Start Timer
  if (quiz.time_limit > 0) {
    let secondsLeft = quiz.time_limit * 60;
    updateTimerDisplay(secondsLeft);
    quizTimer = setInterval(() => {
      secondsLeft--;
      updateTimerDisplay(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(quizTimer);
        alert('Time is up! Submitting your quiz automatically.');
        submitQuiz();
      }
    }, 1000);
  } else {
    document.getElementById('quizTimerDisplay').textContent = 'No Time Limit';
  }

  quizArea.scrollIntoView({ behavior: 'smooth' });
}

function updateTimerDisplay(s) {
  const m = Math.floor(s / 60);
  const rs = s % 60;
  document.getElementById('quizTimerDisplay').textContent = `Time Remaining: ${m}:${rs.toString().padStart(2, '0')}`;
}

async function autoSaveQuiz() {
  if (!currentSubmissionId) return;
  const answers = getQuizAnswers();
  await SupabaseDB.saveQuizSubmission({
    id: currentSubmissionId,
    answers: answers
  });
}

function getQuizAnswers() {
  const answers = {};
  currentQuiz.questions.forEach((q, idx) => {
    if (q.type === 'mcq' || q.type === 'tf') {
      const selected = document.querySelector(`input[name="q-${idx}"]:checked`);
      if (selected) answers[idx] = selected.value;
    } else {
      const input = document.querySelector(`input[data-q-idx="${idx}"]`);
      if (input) answers[idx] = input.value;
    }
  });
  return answers;
}

function getLetterGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

async function submitQuiz() {
  if (quizTimer) clearInterval(quizTimer);
  const user = await SessionManager.getCurrentUser();
  const answers = getQuizAnswers();
  
  // Auto-grading logic
  let score = 0;
  let totalPoints = 0;
  currentQuiz.questions.forEach((q, idx) => {
    totalPoints += q.points;
    const studentAnswer = answers[idx];
    if (q.type === 'url') {
      // URLs are manual, score 0 for now until teacher grades
    } else if (studentAnswer !== undefined && studentAnswer !== null) {
      if (studentAnswer.toString().trim().toLowerCase() === q.correct.toString().trim().toLowerCase()) {
        score += q.points;
      }
    }
  });

  const percentage = Math.round((score / totalPoints) * 100);
  const now = new Date();
  
  // Calculate time spent
  const sub = await supabaseClient.from('quiz_submissions').select('started_at').eq('id', currentSubmissionId).single();
  const timeSpent = sub.data ? Math.round((now - new Date(sub.data.started_at)) / 1000) : 0;

  await SupabaseDB.saveQuizSubmission({
    id: currentSubmissionId,
    answers: answers,
    score: percentage,
    total_points: totalPoints,
    status: 'submitted',
    time_spent: timeSpent,
    submitted_at: now.toISOString()
  });
  alert(`Quiz submitted! Your score: ${percentage}%`);
  currentQuiz = null;
  currentSubmissionId = null;
  renderQuizzes();
}

async function viewQuizResults(quizId) {
  const user = await SessionManager.getCurrentUser();
  const quiz = await SupabaseDB.getQuiz(quizId);
  const subs = await SupabaseDB.getQuizSubmissions(quizId, user.email);
  const bestSub = subs.filter(s => s.status === 'submitted').sort((a,b) => (b.score || 0) - (a.score || 0))[0];

  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <button class="button" onclick="renderQuizzes()">← Back</button>
    <div class="card">
      <h2>Results: ${escapeHtml(quiz.title)}</h2>
      <p><strong>Best Score:</strong> ${bestSub.score}%</p>
      <div style="margin-top:20px">
        ${quiz.questions.map((q, idx) => {
          const studentAnswer = bestSub.answers[idx];
          const isCorrect = q.type !== 'url' && studentAnswer?.toString().trim().toLowerCase() === q.correct.toString().trim().toLowerCase();
          return `
            <div class="question" style="border-left: 5px solid ${isCorrect ? 'var(--ok)' : (q.type === 'url' ? 'var(--warn)' : 'var(--danger)')}">
              <div style="font-weight:bold">Q${idx + 1}: ${escapeHtml(q.text)}</div>
              <div class="small">Your Answer: ${escapeHtml(studentAnswer || 'No Answer')}</div>
              ${!isCorrect && q.type !== 'url' ? `<div class="small" style="color:var(--ok)">Correct Answer: ${escapeHtml(q.type === 'mcq' ? q.options[q.correct] : q.correct)}</div>` : ''}
              ${q.explanation ? `<div class="small" style="margin-top:5px; font-style:italic">📖 Explanation: ${escapeHtml(q.explanation)}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

async function deleteSubmissionById(assignmentId, studentEmail) {
  if (confirm('Delete submission?')) { try { await SupabaseDB.deleteSubmission(assignmentId, studentEmail); renderAssignments(); } catch (e) { alert('Error'); } }
}
async function submitAssignment(assignmentId, studentEmail) {
  const existing = await SupabaseDB.getSubmission(assignmentId, studentEmail);
  const answers = {}; 
  const questions = document.querySelectorAll(`#qwrap-${assignmentId} .question`);
  questions.forEach((qDiv, idx) => { 
    const essay = qDiv.querySelector('textarea'); 
    const link = qDiv.querySelector('.q-link');
    const file = qDiv.querySelector('.q-file');
    if (essay) answers[idx] = essay.value;
    else if (link) answers[idx] = link.value;
    else if (file) answers[idx] = file.value ? file.value.split('\\').pop() : (existing?.answers?.[idx] || '');
  });
  const submission = { assignment_id: assignmentId, student_email: studentEmail, submitted_at: new Date().toISOString(), answers: answers, attachments: [], status: 'submitted' };
  if (await SupabaseDB.saveSubmission(submission)) { alert('Submitted!'); renderAssignments(); }
}
document.querySelectorAll('#studentNav button').forEach(button => {
  button.addEventListener('click', (e) => {
    document.querySelectorAll('#studentNav button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    const page = button.dataset.page;
    if(page === 'courses') renderCourses();
    else if(page === 'assignments') renderAssignments();
    else if(page === 'quizzes') renderQuizzes();
    else if(page === 'achievements') renderAchievements();
    else if(page === 'dashboard') renderDashboardOverview();
    else if(page === 'progress') renderProgress();
    else if(page === 'grades') renderGrades();
    else if(page === 'calendar') renderCalendar();
    else if(page === 'materials') renderMaterials();
    else if(page === 'discussions') renderDiscussions();
    else if(page === 'certificates') renderCertificates();
    else if(page === 'planner') renderPlanner();
    else if(page === 'help') renderHelp();
  });
});

document.getElementById('logoutBtn').addEventListener('click', async ()=>{ await SessionManager.clearCurrentUser(); window.location.href='index.html'; });
setInterval(updateMaintBanner, 1000);
updateMaintBanner();
