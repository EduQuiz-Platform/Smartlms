async function renderDashboard() {
  NotificationManager.initPolling();
  const user = await SessionManager.getCurrentUser();
  const courses = await SupabaseDB.getCourses(user.email);
  const assignments = await SupabaseDB.getAssignments(user.email);
  
  let totalSubmissions = 0;
  let pendingGrading = 0;
  
  for (const a of assignments) {
    const subs = await SupabaseDB.getSubmissions(a.id);
    totalSubmissions += subs.length;
    pendingGrading += subs.filter(s => s.status === 'submitted').length;
  }

  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><h4>My Courses</h4><div class="value">${courses.length}</div></div>
      <div class="stat-card"><h4>Assignments</h4><div class="value">${assignments.length}</div></div>
      <div class="stat-card"><h4>Total Submissions</h4><div class="value">${totalSubmissions}</div></div>
      <div class="stat-card" style="border-left-color: var(--warn)"><h4>Pending Grading</h4><div class="value">${pendingGrading}</div></div>
    </div>
    <section><h3>Teacher Overview</h3><p>Welcome back! You have ${pendingGrading} submissions waiting to be graded.</p></section>
  `;
}

async function renderCourses() {
  const user = await SessionManager.getCurrentUser();
  const courses = await SupabaseDB.getCourses(user.email);
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h2>My Courses</h2><button class="button" onclick="showCourseForm()">+ Create Course</button></div></div>
    <div class="grid">
      ${courses.map(c => `
        <div class="card">
          <h3>${escapeHtml(c.title)}</h3>
          <p class="small">${escapeHtml(c.description || '')}</p>
          <p class="small">Status: ${c.status}</p>
          <div style="margin-top:12px">
            <button class="button" onclick="editCourse('${c.id}')">Manage Lessons</button>
            <button class="button" style="background:#f56565" onclick="deleteCourseById('${c.id}')">Delete</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
function showCourseForm(course = null) {
  const content = document.getElementById('pageContent');
  const isEdit = !!course;
  content.innerHTML = `
    <div class="card">
      <h2>${isEdit ? 'Edit Course' : 'Create Course'}</h2>
      <form id="courseForm">
        <input type="text" id="courseTitle" placeholder="Course Title" value="${isEdit ? escapeHtml(course.title) : ''}" required>
        <textarea id="courseDescription" placeholder="Description" rows="4">${isEdit ? escapeHtml(course.description) : ''}</textarea>
        <select id="courseStatus">
          <option value="draft" ${isEdit && course.status === 'draft' ? 'selected' : ''}>Draft</option>
          <option value="published" ${isEdit && course.status === 'published' ? 'selected' : ''}>Published</option>
        </select>
        <button type="submit" class="button">${isEdit ? 'Update Course' : 'Create Course'}</button>
        <button type="button" class="button" style="background:#e2e8f0;color:#333" onclick="renderCourses()">Cancel</button>
      </form>
    </div>
  `;
  document.getElementById('courseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = await SessionManager.getCurrentUser();
    const data = { id: isEdit ? course.id : crypto.randomUUID(), title: document.getElementById('courseTitle').value, description: document.getElementById('courseDescription').value, status: document.getElementById('courseStatus').value, teacher_email: user.email };
    await SupabaseDB.saveCourse(data); renderCourses();
  });
}
async function editCourse(id) {
  const user = await SessionManager.getCurrentUser();
  const courses = await SupabaseDB.getCourses(user.email);
  const course = courses.find(c => c.id === id);
  const lessons = await SupabaseDB.getLessons(id);
  const assignments = await SupabaseDB.getAssignments(user.email);
  const courseAssignments = assignments.filter(a => a.course_id === id);
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card"><h2>Course: ${escapeHtml(course.title)}</h2><button class="button" onclick="renderCourses()">← Back to Courses</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">
      <section class="card">
        <h3>Lessons</h3><button class="button" onclick="showLessonForm('${id}')">+ Add Lesson</button>
        <div style="margin-top:15px">
          ${lessons.map(l => `
            <div style="padding:10px;border-bottom:1px solid #eee;display:flex;justify-content:space-between">
              <span>${escapeHtml(l.title)}</span>
              <div>
                <button class="button" style="padding:4px 8px;font-size:12px" onclick="editLesson('${l.id}', '${id}')">Edit</button>
                <button class="button" style="padding:4px 8px;font-size:12px;background:#f56565" onclick="deleteLessonById('${l.id}', '${id}')">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
      <section class="card">
        <h3>Assignments</h3><button class="button" onclick="showAssignmentForm(null, '${id}')">+ Create Assignment</button>
        <div style="margin-top:15px">
          ${courseAssignments.map(a => `
            <div style="padding:10px;border-bottom:1px solid #eee;display:flex;justify-content:space-between">
              <span>${escapeHtml(a.title)}</span>
              <div>
                <button class="button" style="padding:4px 8px;font-size:12px" onclick="editAssignment('${a.id}')">Edit</button>
                <button class="button" style="padding:4px 8px;font-size:12px;background:#f56565" onclick="deleteAssignmentById('${a.id}', '${id}')">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}
function showLessonForm(courseId, lesson = null) {
  const isEdit = !!lesson;
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card">
      <h2>${isEdit ? 'Edit Lesson' : 'Add Lesson'}</h2>
      <form id="lessonForm">
        <input type="text" id="lessonTitle" placeholder="Lesson Title" value="${isEdit ? escapeHtml(lesson.title) : ''}" required>
        <textarea id="lessonContent" placeholder="Content" rows="10">${isEdit ? escapeHtml(lesson.content) : ''}</textarea>
        <input type="number" id="lessonOrder" placeholder="Order Index" value="${isEdit ? lesson.order_index : 0}">
        <button type="submit" class="button">${isEdit ? 'Update Lesson' : 'Save Lesson'}</button>
        <button type="button" class="button" style="background:#e2e8f0;color:#333" onclick="editCourse('${courseId}')">Cancel</button>
      </form>
    </div>
  `;
  document.getElementById('lessonForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = { id: isEdit ? lesson.id : crypto.randomUUID(), course_id: courseId, title: document.getElementById('lessonTitle').value, content: document.getElementById('lessonContent').value, order_index: parseInt(document.getElementById('lessonOrder').value) || 0 };
    await SupabaseDB.saveLesson(data); editCourse(courseId);
  });
}
async function editLesson(lessonId, courseId) { const lessons = await SupabaseDB.getLessons(courseId); const lesson = lessons.find(l => l.id === lessonId); showLessonForm(courseId, lesson); }
async function deleteLessonById(id, courseId) { if (confirm('Delete?')) { await SupabaseDB.deleteLesson(id); editCourse(courseId); } }
async function deleteCourseById(id) { if (confirm('Delete?')) { await SupabaseDB.deleteCourse(id); renderCourses(); } }
async function renderAssignments() {
  const user = await SessionManager.getCurrentUser();
  const assignments = await SupabaseDB.getAssignments(user.email);
  const content = document.getElementById('pageContent');
  let totalSubmissions = 0;
  for(const a of assignments) { const subs = await SupabaseDB.getSubmissions(a.id); totalSubmissions += subs.length; }
  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><h4>Total Assignments</h4><div class="value">${assignments.length}</div></div>
      <div class="stat-card"><h4>Published</h4><div class="value">${assignments.filter(a => a.status === 'published').length}</div></div>
      <div class="stat-card"><h4>Total Submissions</h4><div class="value">${totalSubmissions}</div></div>
    </div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h2>My Assignments</h2><button class="button" onclick="showAssignmentForm()">+ Create Assignment</button></div></div>
    <div class="grid">
      ${assignments.map(a => `
        <div class="card">
          <h3>${escapeHtml(a.title)}</h3>
          <p class="small">${escapeHtml(a.description || '')}</p>
          <p class="small">Due: ${new Date(a.due_date).toLocaleString()}</p>
          <div style="margin-top:12px"><button class="button" onclick="editAssignment('${a.id}')">Edit</button><button class="button" style="background:#f56565" onclick="deleteAssignmentById('${a.id}')">Delete</button></div>
        </div>
      `).join('')}
    </div>
  `;
}
async function renderGrading() {
  const user = await SessionManager.getCurrentUser();
  const assignments = await SupabaseDB.getAssignments(user.email);
  const content = document.getElementById('pageContent');
  let gradingHtml = '<div class="card"><h2>Grading Queue</h2></div>';
  for (const assignment of assignments) {
    const submissions = await SupabaseDB.getSubmissions(assignment.id);
    const pendingSubmissions = submissions.filter(s => s.status === 'submitted');
    if (pendingSubmissions.length > 0) {
      gradingHtml += `
        <div class="card">
          <h3>${escapeHtml(assignment.title)}</h3>
          <table><thead><tr><th>Student</th><th>Submitted</th><th>Action</th></tr></thead>
            <tbody>
              ${pendingSubmissions.map(s => `
                <tr><td>${escapeHtml(s.student_email)}</td><td>${new Date(s.submitted_at).toLocaleString()}</td><td><button class="button" onclick="gradeSubmission('${assignment.id}', '${s.student_email}')">Grade</button></td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }
  content.innerHTML = gradingHtml || '<div class="card"><p>No pending submissions to grade.</p></div>';
}
async function renderStudents() {
  const users = await SupabaseDB.getUsers();
  const students = users.filter(u => u.role === 'student');
  const courses = await SupabaseDB.getCourses();
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card"><h2>Students</h2>
      <table><thead><tr><th>Name</th><th>Email</th><th>Level</th><th>Action</th></tr></thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td>${escapeHtml(s.full_name)}</td>
              <td>${escapeHtml(s.email)}</td>
              <td>Level ${s.level || 1}</td>
              <td>
                <button class="button" style="padding:4px 8px; font-size:12px" onclick="showCertForm('${s.email}')">Issue Certificate</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div id="certFormArea" style="display:none; margin-top:20px"></div>
  `;
}

async function showCertForm(studentEmail) {
  const user = await SessionManager.getCurrentUser();
  const courses = await SupabaseDB.getCourses(user.email);
  const area = document.getElementById('certFormArea');
  area.style.display = 'block';
  area.innerHTML = `
    <div class="card">
      <h3>Issue Certificate to ${escapeHtml(studentEmail)}</h3>
      <select id="certCourseId">${courses.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('')}</select>
      <input type="text" id="certUrl" placeholder="Certificate PDF URL" value="https://example.com/cert.pdf">
      <button class="button" onclick="issueCert('${studentEmail}')">Issue</button>
      <button class="button secondary" onclick="document.getElementById('certFormArea').style.display='none'">Cancel</button>
    </div>
  `;
}

async function issueCert(studentEmail) {
  const courseId = document.getElementById('certCourseId').value;
  const certUrl = document.getElementById('certUrl').value;
  await SupabaseDB.issueCertificate({ student_email: studentEmail, course_id: courseId, certificate_url: certUrl });
  alert('Certificate issued!');
  document.getElementById('certFormArea').style.display = 'none';
}
function showAssignmentForm(assignment = null, courseId = null) {
  const content = document.getElementById('pageContent');
  const isEdit = !!assignment;
  const finalCourseId = isEdit ? assignment.course_id : courseId;
  content.innerHTML = `
    <div class="card">
      <h2>${isEdit ? 'Edit Assignment' : 'Create Assignment'}</h2>
      <form id="assignmentForm">
        <input type="text" id="assignmentTitle" placeholder="Assignment Title" value="${isEdit ? escapeHtml(assignment.title) : ''}" required>
        <textarea id="assignmentDescription" placeholder="Description" rows="4">${isEdit ? escapeHtml(assignment.description) : ''}</textarea>
        <input type="datetime-local" id="assignmentDueDate" value="${isEdit ? new Date(assignment.due_date).toISOString().slice(0, 16) : ''}" required>
        <select id="assignmentStatus">
          <option value="draft" ${isEdit && assignment.status === 'draft' ? 'selected' : ''}>Draft</option>
          <option value="published" ${isEdit && assignment.status === 'published' ? 'selected' : ''}>Published</option>
        </select>
        <div style="margin-top:20px"><h3>Questions</h3><div id="questionsContainer"></div><button type="button" class="button" style="background:#4a5568" onclick="addQuestionField()">+ Add Question</button></div>
        <div style="margin-top:30px"><button type="submit" class="button">${isEdit ? 'Update Assignment' : 'Create Assignment'}</button><button type="button" class="button" style="background:#e2e8f0;color:#333" onclick="${finalCourseId ? `editCourse('${finalCourseId}')` : 'renderAssignments()'}">Cancel</button></div>
      </form>
    </div>
  `;
  window.addQuestionField = (q = null) => {
    const container = document.getElementById('questionsContainer');
    const div = document.createElement('div'); div.className = 'question-item';
    div.innerHTML = `
      <button type="button" class="remove-q" onclick="this.parentElement.remove()">Remove</button>
      <div class="grid">
        <div><label>Question Text:</label><input type="text" class="q-text" value="${q ? escapeHtml(q.text) : ''}" required></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label>Type:</label><select class="q-type"><option value="essay" ${q?.type === 'essay' ? 'selected' : ''}>Essay</option><option value="file" ${q?.type === 'file' ? 'selected' : ''}>File</option><option value="link" ${q?.type === 'link' ? 'selected' : ''}>Link</option></select></div>
          <div><label>Points:</label><input type="number" class="q-points" value="${q ? q.points : 10}" min="0"></div>
        </div>
      </div>
    `;
    container.appendChild(div);
  };
  if (isEdit && assignment.questions) { assignment.questions.forEach(q => window.addQuestionField(q)); }
  document.getElementById('assignmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = await SessionManager.getCurrentUser();
    const questions = []; document.querySelectorAll('.question-item').forEach(item => { questions.push({ text: item.querySelector('.q-text').value, type: item.querySelector('.q-type').value, points: parseInt(item.querySelector('.q-points').value) || 0 }); });
    const assignmentData = { id: isEdit ? assignment.id : crypto.randomUUID(), course_id: finalCourseId, title: document.getElementById('assignmentTitle').value, description: document.getElementById('assignmentDescription').value, due_date: new Date(document.getElementById('assignmentDueDate').value).toISOString(), status: document.getElementById('assignmentStatus').value, teacher_email: user.email, created_at: isEdit ? assignment.created_at : new Date().toISOString(), updated_at: new Date().toISOString(), questions: questions, attachments: isEdit ? assignment.attachments : [] };
    const result = await SupabaseDB.saveAssignment(assignmentData);
    if (result) { alert('Success!'); if (finalCourseId) editCourse(finalCourseId); else renderAssignments(); }
  });
}
async function editAssignment(id) { const user = await SessionManager.getCurrentUser(); const assignments = await SupabaseDB.getAssignments(user.email); const assignment = assignments.find(a => a.id === id); if (assignment) showAssignmentForm(assignment); }
async function deleteAssignmentById(id, courseId = null) {
  if (confirm('Delete?')) { await SupabaseDB.deleteAssignment(id); if (courseId) editCourse(courseId); else renderAssignments(); }
}
async function gradeSubmission(assignmentId, studentEmail) {
  const submission = (await SupabaseDB.getSubmissions(assignmentId)).find(s => s.student_email === studentEmail);
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card"><h2>Grade Submission</h2><p><strong>Student:</strong> ${escapeHtml(studentEmail)}</p>
      <form id="gradingForm">
        <div style="margin:20px 0"><h4>Answers:</h4>${Object.entries(submission.answers || {}).map(([idx, answer]) => `<div style="margin:10px 0"><strong>Question ${parseInt(idx) + 1}:</strong><p>${escapeHtml(answer)}</p></div>`).join('')}</div>
        <div><label>Grade (0-100):</label><input type="number" id="grade" min="0" max="100" required></div>
        <div><label>Feedback:</label><textarea id="feedback" rows="4"></textarea></div>
        <button type="submit" class="button">Submit Grade</button><button type="button" class="button" style="background:#e2e8f0;color:#333" onclick="renderGrading()">Cancel</button>
      </form>
    </div>
  `;
  document.getElementById('gradingForm').addEventListener('submit', async (e) => {
    e.preventDefault(); submission.grade = parseInt(document.getElementById('grade').value); submission.feedback = document.getElementById('feedback').value; submission.status = 'graded'; submission.updated_at = new Date().toISOString();
    if (await SupabaseDB.saveSubmission(submission)) { alert('Graded!'); renderGrading(); }
  });
}
async function renderDiscussions() {
  const user = await SessionManager.getCurrentUser();
  const courses = await SupabaseDB.getCourses(user.email);
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <div class="card"><h2>Discussions</h2><p class="small">Manage discussions for your courses.</p></div>
    <div class="grid">
      ${courses.map(c => `<div class="card"><h3>${escapeHtml(c.title)}</h3><button class="button" onclick="viewCourseDiscussions('${c.id}')">View Discussions</button></div>`).join('')}
    </div>
  `;
}

async function viewCourseDiscussions(courseId) {
  const user = await SessionManager.getCurrentUser();
  const disc = await SupabaseDB.getDiscussions(courseId);
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <button class="button" onclick="renderDiscussions()">← Back</button>
    <div class="card">
      <h3>Course Discussions</h3>
      <div id="disc-list" style="margin-bottom:20px; max-height:400px; overflow-y:auto">
        ${disc.map(d => `
          <div class="question" style="margin-bottom:10px">
            <div class="small"><strong>${escapeHtml(d.user_email)}</strong> - ${new Date(d.created_at).toLocaleString()}</div>
            <div style="margin-top:5px">${escapeHtml(d.content)}</div>
          </div>
        `).join('') || '<p class="small">No messages yet.</p>'}
      </div>
      <div style="display:flex; gap:10px">
        <input type="text" id="discInput" placeholder="Write a reply..." style="margin:0">
        <button class="button" onclick="postTeacherDiscussion('${courseId}')">Post</button>
      </div>
    </div>
  `;
}

async function postTeacherDiscussion(courseId) {
  const user = await SessionManager.getCurrentUser();
  const content = document.getElementById('discInput').value;
  if (!content) return;
  await SupabaseDB.saveDiscussion({ course_id: courseId, user_email: user.email, content });
  viewCourseDiscussions(courseId);
}

async function renderBadges() {
  const badges = await SupabaseDB.getBadges();
  const students = (await SupabaseDB.getUsers()).filter(u => u.role === 'student');
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <div class="card"><h2>Badges Management</h2><button class="button" onclick="showBadgeForm()">+ Create Badge</button></div>
    <div class="grid">
      ${badges.map(b => `
        <div class="card">
          <div style="font-size:30px">${b.icon_url || '🏆'}</div>
          <h3>${escapeHtml(b.title)}</h3>
          <p class="small">${escapeHtml(b.description)}</p>
          <div style="margin-top:10px">
            <select id="award-to-${b.id}" style="width:auto; margin-bottom:0">${students.map(s => `<option value="${s.email}">${escapeHtml(s.full_name)}</option>`).join('')}</select>
            <button class="button" style="padding:4px 8px; font-size:12px" onclick="awardBadge('${b.id}')">Award</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function showBadgeForm() {
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <div class="card">
      <h2>Create Badge</h2>
      <form id="badgeForm">
        <input type="text" id="badgeTitle" placeholder="Badge Title" required>
        <textarea id="badgeDesc" placeholder="Description"></textarea>
        <input type="text" id="badgeIcon" placeholder="Icon (emoji or URL)">
        <button type="submit" class="button">Save Badge</button>
        <button type="button" class="button secondary" onclick="renderBadges()">Cancel</button>
      </form>
    </div>
  `;
  document.getElementById('badgeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await SupabaseDB.saveBadge({ title: document.getElementById('badgeTitle').value, description: document.getElementById('badgeDesc').value, icon_url: document.getElementById('badgeIcon').value });
    renderBadges();
  });
}

async function awardBadge(badgeId) {
  const email = document.getElementById(`award-to-${badgeId}`).value;
  await SupabaseDB.awardBadge(email, badgeId);
  alert('Badge awarded!');
}

async function renderQuizzes() {
  const user = await SessionManager.getCurrentUser();
  const quizzes = await SupabaseDB.getQuizzes(null, user.email);
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h2>Quizzes</h2><button class="button" onclick="showQuizForm()">+ Create Quiz</button></div></div>
    <div class="grid">
      ${quizzes.map(q => `
        <div class="card">
          <h3>${escapeHtml(q.title)}</h3>
          <p class="small">Status: ${q.status}</p>
          <p class="small">Questions: ${q.questions?.length || 0}</p>
          <div style="margin-top:12px">
            <button class="button" onclick="editQuiz('${q.id}')">Edit</button>
            <button class="button" style="background:var(--ok)" onclick="viewQuizResults('${q.id}')">Results</button>
            <button class="button" style="background:var(--danger)" onclick="deleteQuizById('${q.id}')">Delete</button>
          </div>
        </div>
      `).join('') || '<div class="empty">No quizzes created yet.</div>'}
    </div>
  `;
}

function showQuizForm(quiz = null) {
  const isEdit = !!quiz;
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <div class="card">
      <h2>${isEdit ? 'Edit Quiz' : 'Create Quiz'}</h2>
      <form id="quizForm">
        <input type="text" id="quizTitle" placeholder="Quiz Title" value="${isEdit ? escapeHtml(quiz.title) : ''}" required>
        <textarea id="quizDesc" placeholder="Description">${isEdit ? escapeHtml(quiz.description) : ''}</textarea>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px">
          <div><label>Time Limit (min):</label><input type="number" id="quizLimit" value="${isEdit ? quiz.time_limit : 0}"></div>
          <div><label>Attempts Allowed:</label><input type="number" id="quizAttempts" value="${isEdit ? quiz.attempts_allowed : 1}" min="1"></div>
        </div>
        <select id="quizStatus">
          <option value="draft" ${isEdit && quiz.status === 'draft' ? 'selected' : ''}>Draft</option>
          <option value="published" ${isEdit && quiz.status === 'published' ? 'selected' : ''}>Published</option>
        </select>
        <div style="margin-top:20px"><h3>Questions</h3><div id="quizQuestionsContainer"></div><button type="button" class="button" style="background:#4a5568" onclick="addQuizQuestionField()">+ Add Question</button></div>
        <div style="margin-top:30px">
          <button type="submit" class="button">${isEdit ? 'Update Quiz' : 'Save Quiz'}</button>
          <button type="button" class="button secondary" onclick="renderQuizzes()">Cancel</button>
        </div>
      </form>
    </div>
  `;
  window.addQuizQuestionField = (q = null) => {
    const container = document.getElementById('quizQuestionsContainer');
    const div = document.createElement('div'); div.className = 'question-item';
    div.innerHTML = `
      <button type="button" class="remove-q" onclick="this.parentElement.remove()">Remove</button>
      <input type="text" class="q-text" placeholder="Question Text" value="${q ? escapeHtml(q.text) : ''}" required>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px">
        <select class="q-type" onchange="toggleQuizOptions(this)">
          <option value="mcq" ${q?.type === 'mcq' ? 'selected' : ''}>Multiple Choice</option>
          <option value="tf" ${q?.type === 'tf' ? 'selected' : ''}>True/False</option>
          <option value="short" ${q?.type === 'short' ? 'selected' : ''}>Short Answer</option>
          <option value="url" ${q?.type === 'url' ? 'selected' : ''}>URL Submission</option>
        </select>
        <input type="number" class="q-points" placeholder="Points" value="${q ? q.points : 5}">
      </div>
      <div class="q-options" style="margin-top:10px">
        ${renderQuizOptions(q)}
      </div>
      <div style="margin-top:10px">
        <input type="text" class="q-hint" placeholder="Hint (optional)" value="${q?.hint ? escapeHtml(q.hint) : ''}">
        <textarea class="q-explanation" placeholder="Explanation (optional)" rows="2">${q?.explanation ? escapeHtml(q.explanation) : ''}</textarea>
      </div>
    `;
    container.appendChild(div);
  };
  window.renderQuizOptions = (q) => {
    if (q?.type === 'tf') return `<select class="q-correct"><option value="True" ${q.correct === 'True' ? 'selected' : ''}>True</option><option value="False" ${q.correct === 'False' ? 'selected' : ''}>False</option></select>`;
    if (q?.type === 'short') return `<input type="text" class="q-correct" placeholder="Correct Answer (Exact Match)" value="${q.correct || ''}">`;
    if (q?.type === 'url') return `<p class="small">Students will submit a URL. Teachers will manually grade this.</p><input type="hidden" class="q-correct" value="MANUAL">`;
    const id = Date.now() + Math.random();
    return `<div class="mcq-options">${(q?.options || ['','','','']).map((opt, i) => `<div>Option ${i+1}: <input type="text" class="opt-val" value="${escapeHtml(opt)}"> <input type="radio" name="correct-${id}" ${q?.correct === i.toString() ? 'checked' : ''} value="${i}"> Correct</div>`).join('')}</div>`;
  };
  window.toggleQuizOptions = (select) => {
    const container = select.parentElement.parentElement.querySelector('.q-options');
    container.innerHTML = renderQuizOptions({ type: select.value });
  };
  if (isEdit && quiz.questions) { quiz.questions.forEach(q => window.addQuizQuestionField(q)); }
  document.getElementById('quizForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = await SessionManager.getCurrentUser();
    const questions = [];
    document.querySelectorAll('#quizQuestionsContainer .question-item').forEach(item => {
      const type = item.querySelector('.q-type').value;
      const qData = { text: item.querySelector('.q-text').value, type, points: parseInt(item.querySelector('.q-points').value) || 0, hint: item.querySelector('.q-hint').value, explanation: item.querySelector('.q-explanation').value };
      if (type === 'mcq') {
        qData.options = Array.from(item.querySelectorAll('.opt-val')).map(i => i.value);
        const checked = item.querySelector('input[type="radio"]:checked');
        qData.correct = checked ? checked.value : '0';
      } else {
        qData.correct = item.querySelector('.q-correct').value;
      }
      questions.push(qData);
    });
    await SupabaseDB.saveQuiz({ id: isEdit ? quiz.id : crypto.randomUUID(), teacher_email: user.email, title: document.getElementById('quizTitle').value, description: document.getElementById('quizDesc').value, time_limit: parseInt(document.getElementById('quizLimit').value) || 0, attempts_allowed: parseInt(document.getElementById('quizAttempts').value) || 1, status: document.getElementById('quizStatus').value, questions });
    renderQuizzes();
  });
}

async function editQuiz(id) {
  const user = await SessionManager.getCurrentUser();
  const quizzes = await SupabaseDB.getQuizzes(null, user.email);
  const quiz = quizzes.find(q => q.id === id);
  showQuizForm(quiz);
}

async function deleteQuizById(id) {
  if (confirm('Delete Quiz?')) { await SupabaseDB.deleteQuiz(id); renderQuizzes(); }
}

async function viewQuizResults(quizId) {
  const subs = await SupabaseDB.getQuizSubmissions(quizId);
  const container = document.getElementById('pageContent');
  container.innerHTML = `
    <button class="button" onclick="renderQuizzes()">← Back</button>
    <div class="card">
      <h2>Quiz Results</h2>
      <table>
        <thead><tr><th>Student</th><th>Score</th><th>Points</th><th>Submitted</th></tr></thead>
        <tbody>
          ${subs.map(s => `<tr><td>${escapeHtml(s.student_email)}</td><td>${s.score}</td><td>${s.total_points}</td><td>${new Date(s.submitted_at).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No submissions yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

document.querySelectorAll('#teacherNav button').forEach(button => {
  button.addEventListener('click', (e) => {
    document.querySelectorAll('#teacherNav button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    const page = button.dataset.page;
    if(page === 'dashboard') renderDashboard();
    else if(page === 'courses') renderCourses();
    else if(page === 'assignments') renderAssignments();
    else if(page === 'grading') renderGrading();
    else if(page === 'students') renderStudents();
    else if(page === 'discussions') renderDiscussions();
    else if(page === 'badges') renderBadges();
    else if(page === 'quizzes') renderQuizzes();
  });
});
document.getElementById('logoutBtn').addEventListener('click', async () => { await SessionManager.clearCurrentUser(); window.location.href = 'index.html'; });
