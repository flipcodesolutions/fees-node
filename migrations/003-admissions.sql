-- Up
CREATE TABLE IF NOT EXISTS admissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inquiry_id INTEGER,
    student_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    reference_name TEXT,
    inquiry_for TEXT,
    remark TEXT,
    payload_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Down
DROP TABLE IF EXISTS admissions;

