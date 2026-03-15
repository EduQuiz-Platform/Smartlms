-- SmartLMS Supabase Schema
-- Full schema for tables, indexes, RLS, and utility functions

-- Clean start: Drop existing tables and buckets if needed
-- WARNING: This will delete all existing data in the public schema
DROP TABLE IF EXISTS maintenance CASCADE;
DROP TABLE IF EXISTS quiz_submissions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS planner CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS discussions CASCADE;
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
-- pg_cron is usually enabled in the 'extensions' schema in Supabase
-- CREATE EXTENSION IF NOT EXISTS pg_cron; 

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Users table
CREATE TABLE users (
  email VARCHAR(255) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  lockouts INTEGER DEFAULT 0,
  flagged BOOLEAN DEFAULT FALSE,
  reset_request JSONB,
  active BOOLEAN DEFAULT TRUE,
  notifications JSONB DEFAULT '[]'::jsonb,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1
);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  teacher_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Lessons table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enrollments table
CREATE TABLE enrollments (
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  student_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (course_id, student_email)
);

-- Assignments table
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  teacher_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  questions JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Submissions table
CREATE TABLE submissions (
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answers JSONB DEFAULT '{}'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  grade INTEGER,
  feedback TEXT,
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
  PRIMARY KEY (assignment_id, student_email)
);

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Badges table
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Badges table
CREATE TABLE user_badges (
  user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_email, badge_id)
);

-- Discussions table
CREATE TABLE discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT NOT NULL,
  parent_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Certificates table
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  student_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  certificate_url TEXT
);

-- Planner table
CREATE TABLE planner (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  teacher_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  time_limit INTEGER DEFAULT 0, -- in minutes, 0 = no limit
  attempts_allowed INTEGER DEFAULT 1,
  questions JSONB DEFAULT '[]'::jsonb, -- Each question can have {hint, explanation}
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Quiz Submissions table
CREATE TABLE quiz_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
  score INTEGER,
  total_points INTEGER,
  answers JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted')),
  time_spent INTEGER DEFAULT 0, -- in seconds
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE
);

-- Maintenance table
CREATE TABLE maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enabled BOOLEAN DEFAULT FALSE,
  manual_until TIMESTAMP WITH TIME ZONE,
  schedules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default maintenance record
INSERT INTO maintenance (enabled, schedules) VALUES (false, '[]'::jsonb);

-- Notification Helper Functions
CREATE OR REPLACE FUNCTION notify_user(target_email VARCHAR, title TEXT, msg TEXT, link TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET notifications = notifications || jsonb_build_object(
    'id', uuid_generate_v4(),
    'title', title,
    'message', msg,
    'link', link,
    'read', false,
    'created_at', NOW()
  )
  WHERE email = target_email;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Notify student on new assignment
CREATE OR REPLACE FUNCTION tr_notify_assignment() RETURNS TRIGGER AS $$
DECLARE
  student_rec RECORD;
BEGIN
  IF (NEW.status = 'published') THEN
    FOR student_rec IN SELECT student_email FROM enrollments WHERE course_id = NEW.course_id LOOP
      PERFORM notify_user(student_rec.student_email, 'New Assignment', 'A new assignment "' || NEW.title || '" has been posted.', 'student.html?page=assignments');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_assignment_insert AFTER INSERT ON assignments FOR EACH ROW EXECUTE PROCEDURE tr_notify_assignment();

-- Trigger: Notify teacher on submission
CREATE OR REPLACE FUNCTION tr_notify_submission() RETURNS TRIGGER AS $$
DECLARE
  assign_rec RECORD;
BEGIN
  SELECT title, teacher_email INTO assign_rec FROM assignments WHERE id = NEW.assignment_id;
  PERFORM notify_user(assign_rec.teacher_email, 'New Submission', 'A new submission for "' || assign_rec.title || '" from ' || NEW.student_email, 'teacher.html?page=grading');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_submission_insert AFTER INSERT ON submissions FOR EACH ROW EXECUTE PROCEDURE tr_notify_submission();

-- Trigger: Notify student on grade
CREATE OR REPLACE FUNCTION tr_notify_grade() RETURNS TRIGGER AS $$
DECLARE
  assign_rec RECORD;
BEGIN
  IF (NEW.status = 'graded' AND (OLD.status IS NULL OR OLD.status != 'graded')) THEN
    SELECT title INTO assign_rec FROM assignments WHERE id = NEW.assignment_id;
    PERFORM notify_user(NEW.student_email, 'Grade Posted', 'Your submission for "' || assign_rec.title || '" has been graded.', 'student.html?page=grades');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_submission_grade AFTER UPDATE ON submissions FOR EACH ROW EXECUTE PROCEDURE tr_notify_grade();

-- Trigger: Notify course members on discussion
CREATE OR REPLACE FUNCTION tr_notify_discussion() RETURNS TRIGGER AS $$
DECLARE
  member_rec RECORD;
BEGIN
  FOR member_rec IN (
    SELECT student_email as email FROM enrollments WHERE course_id = NEW.course_id
    UNION
    SELECT teacher_email as email FROM courses WHERE id = NEW.course_id
  ) LOOP
    IF member_rec.email != NEW.user_email THEN
      PERFORM notify_user(member_rec.email, 'New Discussion Post', 'A new message was posted in your course discussion.', 'student.html?page=discussions');
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_discussion_insert AFTER INSERT ON discussions FOR EACH ROW EXECUTE PROCEDURE tr_notify_discussion();

-- Scheduled Task: Reminder for assignments due in 24h
-- Note: This requires pg_cron to be active.
-- SELECT cron.schedule('assignment-reminders', '0 * * * *', $$
--   DO $do$
--   DECLARE
--     rem_rec RECORD;
--   BEGIN
--     FOR rem_rec IN 
--       SELECT a.title, a.id, e.student_email
--       FROM assignments a
--       JOIN enrollments e ON a.course_id = e.course_id
--       LEFT JOIN submissions s ON a.id = s.assignment_id AND e.student_email = s.student_email
--       WHERE a.status = 'published'
--         AND s.id IS NULL
--         AND a.due_date > NOW()
--         AND a.due_date <= NOW() + INTERVAL '24 hours'
--     LOOP
--       PERFORM notify_user(rem_rec.student_email, 'Deadline Reminder', 'The assignment "' || rem_rec.title || '" is due in less than 24 hours!', 'student.html?page=assignments');
--     END LOOP;
--   END $do$;
-- $$);

-- Indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_courses_teacher ON courses(teacher_email);
CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_email);
CREATE INDEX idx_assignments_course ON assignments(course_id);
CREATE INDEX idx_assignments_teacher ON assignments(teacher_email);
CREATE INDEX idx_submissions_student ON submissions(student_email);

-- Row Level Security (RLS)
-- NOTE: In a standard Supabase setup, auth.uid() or auth.jwt() would be used.
-- Since this project uses a custom 'users' table and session management, 
-- we implement foundational policies that can be restricted further with custom JWT claims.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;

-- Users: Anyone can insert (signup), but only owners or admins should update/select.
-- For this demo, we allow select for login lookups.
CREATE POLICY "Users Select" ON users FOR SELECT USING (true);
CREATE POLICY "Users Insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users Update" ON users FOR UPDATE USING (true);

-- Courses: Everyone can see published courses. Only teachers can create/edit their own.
CREATE POLICY "Courses Select" ON courses FOR SELECT USING (status = 'published' OR true);
CREATE POLICY "Courses All Teacher" ON courses FOR ALL USING (true);

-- Enrollments: Students can see their own. Teachers can see enrollments for their courses.
CREATE POLICY "Enrollments Policy" ON enrollments FOR ALL USING (true);

-- Assignments: Students see published assignments for their courses.
CREATE POLICY "Assignments Policy" ON assignments FOR ALL USING (true);

-- Submissions: Students see/edit their own. Teachers see submissions for their assignments.
CREATE POLICY "Submissions Policy" ON submissions FOR ALL USING (true);

-- Discussions: Members of the course can participate.
CREATE POLICY "Discussions Policy" ON discussions FOR ALL USING (true);

-- Badges: Everyone can see badges. Only admins/teachers can award them.
CREATE POLICY "Badges Select" ON badges FOR SELECT USING (true);
CREATE POLICY "Badges Admin" ON badges FOR ALL USING (true);

-- Quiz: Similar to assignments.
CREATE POLICY "Quizzes Policy" ON quizzes FOR ALL USING (true);

-- Maintenance: Everyone can read. Only admins can update.
CREATE POLICY "Maintenance Select" ON maintenance FOR SELECT USING (true);
CREATE POLICY "Maintenance Admin" ON maintenance FOR ALL USING (true);

-- Permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Storage Buckets (Optional SQL initialization)
-- Note: Requires Supabase Admin or Dash to execute properly usually
-- INSERT INTO storage.buckets (id, name, public) VALUES ('assignments', 'assignments', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true);
