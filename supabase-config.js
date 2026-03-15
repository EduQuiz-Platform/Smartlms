// Supabase Configuration
// Public anon key is safe to expose in client-side code.
const SUPABASE_URL = 'https://naobwyahzrlupijubrio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hb2J3eWFoenJsdXBpanVicmlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjgzNzksImV4cCI6MjA4ODY0NDM3OX0.gjG7cYBwSZHmAMKiBFTpmnaZ0updwvy-3AU5PrJg5w8';

// Initialize Supabase client
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase Database Operations
class SupabaseDB {
    // User operations
    static async getUsers() {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*');
        if (error) throw error;
        return data || [];
    }

    static async getQuiz(id) {
        const { data, error } = await supabaseClient.from('quizzes').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    static async saveUser(user) {
        const { data, error } = await supabaseClient
            .from('users')
            .upsert(user, { onConflict: 'email' })
            .select();
        if (error) throw error;
        return data?.[0];
    }

    static async getUser(email) {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async deleteUser(email) {
        const { error } = await supabaseClient
            .from('users')
            .delete()
            .eq('email', email);
        if (error) throw error;
    }

    // Assignment operations
    static async getAssignments(teacherEmail = null) {
        let query = supabaseClient.from('assignments').select('*');
        if (teacherEmail) {
            query = query.eq('teacher_email', teacherEmail);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    static async getAssignment(id) {
        const { data, error } = await supabaseClient
            .from('assignments')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }

    static async saveAssignment(assignment) {
        const { data, error } = await supabaseClient
            .from('assignments')
            .upsert(assignment, { onConflict: 'id' })
            .select();
        if (error) throw error;
        return data?.[0];
    }

    static async deleteAssignment(id) {
        const { error } = await supabaseClient
            .from('assignments')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    // Course operations
    static async getCourses(teacherEmail = null) {
        let query = supabaseClient.from('courses').select('*');
        if (teacherEmail) query = query.eq('teacher_email', teacherEmail);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    static async saveCourse(course) {
        const { data, error } = await supabaseClient
            .from('courses')
            .upsert(course, { onConflict: 'id' })
            .select();
        if (error) throw error;
        return data?.[0];
    }

    static async deleteCourse(id) {
        const { error } = await supabaseClient.from('courses').delete().eq('id', id);
        if (error) throw error;
    }

    // Lesson operations
    static async getLessons(courseId) {
        const { data, error } = await supabaseClient
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    static async saveLesson(lesson) {
        const { data, error } = await supabaseClient
            .from('lessons')
            .upsert(lesson, { onConflict: 'id' })
            .select();
        if (error) throw error;
        return data?.[0];
    }

    static async deleteLesson(id) {
        const { error } = await supabaseClient.from('lessons').delete().eq('id', id);
        if (error) throw error;
    }

    // Enrollment operations
    static async getEnrollments(studentEmail = null, courseId = null) {
        let query = supabaseClient.from('enrollments').select('*');
        if (studentEmail) query = query.eq('student_email', studentEmail);
        if (courseId) query = query.eq('course_id', courseId);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    static async saveEnrollment(enrollment) {
        const { data, error } = await supabaseClient
            .from('enrollments')
            .upsert(enrollment, { onConflict: ['course_id', 'student_email'] })
            .select();
        if (error) throw error;
        return data?.[0];
    }

    // Submission operations
    static async getSubmissions(assignmentId = null, studentEmail = null) {
        let query = supabaseClient.from('submissions').select('*');
        if (assignmentId) query = query.eq('assignment_id', assignmentId);
        if (studentEmail) query = query.eq('student_email', studentEmail);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    static async getSubmission(assignmentId, studentEmail) {
        const { data, error } = await supabaseClient
            .from('submissions')
            .select('*')
            .eq('assignment_id', assignmentId)
            .eq('student_email', studentEmail)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async saveSubmission(submission) {
        const { data, error } = await supabaseClient
            .from('submissions')
            .upsert(submission, { onConflict: ['assignment_id', 'student_email'] })
            .select();
        if (error) throw error;
        return data?.[0];
    }

    static async deleteSubmission(assignmentId, studentEmail) {
        const { error } = await supabaseClient
            .from('submissions')
            .delete()
            .eq('assignment_id', assignmentId)
            .eq('student_email', studentEmail);
        if (error) throw error;
    }

    // Maintenance operations
    static async getMaintenance() {
        const { data, error } = await supabaseClient
            .from('maintenance')
            .select('*')
            .limit(1)
            .maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        return data || { enabled: false, schedules: [] };
    }

    static async saveMaintenance(maintenance) {
        const { data, error } = await supabaseClient
            .from('maintenance')
            .upsert(maintenance, { onConflict: 'id' })
            .select();
        if (error) throw error;
        return data?.[0];
    }

    // New features operations
    static async getBadges() {
        const { data, error } = await supabaseClient.from('badges').select('*');
        if (error) throw error;
        return data || [];
    }

    static async saveBadge(badge) {
        const { data, error } = await supabaseClient.from('badges').upsert(badge).select();
        if (error) throw error;
        return data?.[0];
    }

    static async getUserBadges(email) {
        const { data, error } = await supabaseClient.from('user_badges').select('*, badges(*)').eq('user_email', email);
        if (error) throw error;
        return data || [];
    }

    static async awardBadge(userEmail, badgeId) {
        const { data, error } = await supabaseClient.from('user_badges').upsert({ user_email: userEmail, badge_id: badgeId }).select();
        if (error) throw error;
        return data?.[0];
    }

    static async getDiscussions(courseId) {
        const { data, error } = await supabaseClient.from('discussions').select('*').eq('course_id', courseId).order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    static async saveDiscussion(discussion) {
        const { data, error } = await supabaseClient.from('discussions').upsert(discussion).select();
        if (error) throw error;
        return data?.[0];
    }

    static async getCertificates(email) {
        const { data, error } = await supabaseClient.from('certificates').select('*, courses(*)').eq('student_email', email);
        if (error) throw error;
        return data || [];
    }

    static async issueCertificate(cert) {
        const { data, error } = await supabaseClient.from('certificates').upsert(cert).select();
        if (error) throw error;
        return data?.[0];
    }

    static async getPlannerItems(email) {
        const { data, error } = await supabaseClient.from('planner').select('*').eq('user_email', email).order('due_date', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    static async savePlannerItem(item) {
        const { data, error } = await supabaseClient.from('planner').upsert(item).select();
        if (error) throw error;
        return data?.[0];
    }

    static async deletePlannerItem(id) {
        const { error } = await supabaseClient.from('planner').delete().eq('id', id);
        if (error) throw error;
    }

    static async updateXP(email, xpAdd) {
        const user = await this.getUser(email);
        if (!user) return;
        const newXP = (user.xp || 0) + xpAdd;
        const newLevel = Math.floor(newXP / 100) + 1;
        await this.saveUser({ ...user, xp: newXP, level: newLevel });
    }

    // Quiz operations
    static async getQuizzes(courseId = null, teacherEmail = null) {
        let query = supabaseClient.from('quizzes').select('*');
        if (courseId) query = query.eq('course_id', courseId);
        if (teacherEmail) query = query.eq('teacher_email', teacherEmail);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    static async saveQuiz(quiz) {
        const { data, error } = await supabaseClient.from('quizzes').upsert(quiz).select();
        if (error) throw error;
        return data?.[0];
    }

    static async deleteQuiz(id) {
        const { error } = await supabaseClient.from('quizzes').delete().eq('id', id);
        if (error) throw error;
    }

    static async getQuizSubmissions(quizId = null, studentEmail = null) {
        let query = supabaseClient.from('quiz_submissions').select('*, quizzes(*)');
        if (quizId) query = query.eq('quiz_id', quizId);
        if (studentEmail) query = query.eq('student_email', studentEmail);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    static async saveQuizSubmission(submission) {
        const { data, error } = await supabaseClient.from('quiz_submissions').upsert(submission).select();
        if (error) throw error;
        return data?.[0];
    }
}
window.SupabaseDB = SupabaseDB;

// Session management
class SessionManager {
    static async setCurrentUser(user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    }

    static async getCurrentUser() {
        const raw = sessionStorage.getItem('currentUser');
        return raw ? JSON.parse(raw) : null;
    }

    static async clearCurrentUser() {
        sessionStorage.removeItem('currentUser');
    }

    static getSessionId() {
        let sid = sessionStorage.getItem('sessionId');
        if (!sid) {
            sid = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            sessionStorage.setItem('sessionId', sid);
        }
        return sid;
    }
}
window.SessionManager = SessionManager;

// Utility functions
window.normalizeEmail = function(email) {
    return (email || '').trim().toLowerCase();
};

window.isStrongPassword = function(pass) {
    if (!pass || pass.length < 8) return false;
    const hasLetter = /[A-Za-z]/.test(pass);
    const hasNumber = /\d/.test(pass);
    return hasLetter && hasNumber;
}

window.isAccountLocked = function(user) {
    return !!(user && user.locked_until && Date.now() < new Date(user.locked_until).getTime());
};

window.isActiveMaintenance = function(m) {
    const now = new Date().getTime();
    if (m.enabled && m.manual_until && now < new Date(m.manual_until).getTime()) return true;
    const schedules = Array.isArray(m.schedules) ? m.schedules : [];
    return schedules.some(s => now >= new Date(s.startAt).getTime() && now <= new Date(s.endAt).getTime());
}

window.getUpcomingMaintenance = function(m) {
    const now = new Date().getTime();
    const schedules = (Array.isArray(m.schedules) ? m.schedules : []).filter(s => new Date(s.startAt).getTime() > now).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    return schedules[0] || null;
};

window.getActiveMaintenanceEnd = function(m) {
    const now = new Date().getTime();
    if (m && m.manual_until && now < new Date(m.manual_until).getTime()) return new Date(m.manual_until).getTime();
    const s = (Array.isArray(m.schedules) ? m.schedules : []).find(s => now >= new Date(s.startAt).getTime() && now <= new Date(s.endAt).getTime());
    return s ? new Date(s.endAt).getTime() : null;
}

window.escapeHtml = function(s) {
    if (s === null || s === undefined) return '';
    return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
};

window.escapeAttr = function(s) {
    if (s === null || s === undefined) return '';
    return String(s).replaceAll('"', '&quot;');
}
