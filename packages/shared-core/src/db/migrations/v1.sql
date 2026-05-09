PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Migration tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ---------------------------------------------------------------------------
-- Project
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project (
  id TEXT PRIMARY KEY CHECK (id = 'singleton'),
  name TEXT NOT NULL,
  vision TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ---------------------------------------------------------------------------
-- Milestone
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS milestone (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id),
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  close_reason TEXT,
  branch TEXT NOT NULL DEFAULT '',
  archived_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ---------------------------------------------------------------------------
-- Slice
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slice (
  id TEXT PRIMARY KEY,
  milestone_id TEXT REFERENCES milestone(id),
  kind TEXT NOT NULL DEFAULT 'milestone' CHECK (kind IN ('milestone', 'quick', 'debug')),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'discussing' CHECK (status IN ('discussing', 'researching', 'planning', 'executing', 'verifying', 'reviewing', 'completing', 'closed')),
  tier TEXT CHECK (tier IN ('S', 'SS', 'SSS')),
  base_branch TEXT,
  branch_name TEXT,
  archived_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ---------------------------------------------------------------------------
-- Task
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task (
  id TEXT PRIMARY KEY,
  slice_id TEXT NOT NULL REFERENCES slice(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  wave INTEGER,
  claimed_at INTEGER,
  claimed_by TEXT,
  closed_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ---------------------------------------------------------------------------
-- Dependency (task-to-task blocking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dependency (
  from_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'blocks' CHECK (type IN ('blocks')),
  PRIMARY KEY (from_id, to_id)
);

-- ---------------------------------------------------------------------------
-- Slice dependency (slice-to-slice blocking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slice_dependency (
  from_id TEXT NOT NULL REFERENCES slice(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES slice(id) ON DELETE CASCADE,
  PRIMARY KEY (from_id, to_id)
);

-- ---------------------------------------------------------------------------
-- Workflow session
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_session (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  phase TEXT NOT NULL DEFAULT 'idle',
  active_slice_id TEXT REFERENCES slice(id),
  active_milestone_id TEXT REFERENCES milestone(id),
  paused_at INTEGER,
  context_json TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ---------------------------------------------------------------------------
-- Review
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slice_id TEXT NOT NULL REFERENCES slice(id),
  type TEXT NOT NULL CHECK (type IN ('code', 'security', 'spec')),
  reviewer TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('approve', 'request_changes', 'reject')),
  commit_sha TEXT NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ---------------------------------------------------------------------------
-- Milestone audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS milestone_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  milestone_id TEXT NOT NULL REFERENCES milestone(id),
  verdict TEXT NOT NULL CHECK (verdict IN ('ready', 'not_ready')),
  audited_at INTEGER NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ---------------------------------------------------------------------------
-- Pending judgments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_judgments (
  slice_id TEXT PRIMARY KEY REFERENCES slice(id) ON DELETE CASCADE,
  merge_sha TEXT,
  base_ref TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ---------------------------------------------------------------------------
-- Event log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ---------------------------------------------------------------------------
-- Phase run
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS phase_run (
  id TEXT PRIMARY KEY,
  slice_id TEXT NOT NULL REFERENCES slice(id),
  phase TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'abandoned', 'retried')),
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  duration_ms INTEGER,
  error TEXT,
  feedback TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_milestone_project ON milestone(project_id);
CREATE INDEX IF NOT EXISTS idx_milestone_archived ON milestone(archived_at);
CREATE INDEX IF NOT EXISTS idx_slice_milestone ON slice(milestone_id);
CREATE INDEX IF NOT EXISTS idx_slice_status ON slice(status);
CREATE INDEX IF NOT EXISTS idx_slice_kind ON slice(kind);
CREATE INDEX IF NOT EXISTS idx_slice_kind_status ON slice(kind, status);
CREATE INDEX IF NOT EXISTS idx_slice_archived ON slice(archived_at);
CREATE INDEX IF NOT EXISTS idx_task_slice ON task(slice_id);
CREATE INDEX IF NOT EXISTS idx_task_status ON task(status);
CREATE INDEX IF NOT EXISTS idx_task_wave ON task(slice_id, wave);
CREATE INDEX IF NOT EXISTS idx_review_slice ON review(slice_id, type);
CREATE INDEX IF NOT EXISTS idx_milestone_audit_verdict ON milestone_audit(verdict);
CREATE INDEX IF NOT EXISTS idx_pending_judgments_created ON pending_judgments(created_at);
CREATE INDEX IF NOT EXISTS idx_event_log_entity ON event_log(entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_phase_run_slice ON phase_run(slice_id);
CREATE INDEX IF NOT EXISTS idx_phase_run_phase ON phase_run(phase);
