-- Up
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT,
    name TEXT NOT NULL,
    duration TEXT,
    fees TEXT,
    details TEXT,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Down
DROP TABLE IF EXISTS courses;

