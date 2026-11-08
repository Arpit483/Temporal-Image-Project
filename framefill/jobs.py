"""SQLite-backed async job store for the FrameFill API."""
import asyncio
import json
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent.parent / "framefill_jobs.db"

# Job states
PENDING = "pending"
RUNNING = "running"
DONE = "done"
FAILED = "failed"
CANCELLED = "cancelled"


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'pending',
                method TEXT,
                gap_min REAL,
                physical INTEGER,
                progress REAL DEFAULT 0,
                log TEXT DEFAULT '',
                result TEXT,
                error TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS exports (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                type TEXT NOT NULL,
                path TEXT,
                size INTEGER,
                status TEXT DEFAULT 'pending',
                created_at TEXT
            )
        """)
        conn.commit()


def create_job(method: str, gap_min: float) -> str:
    jid = uuid.uuid4().hex[:12]
    with _get_conn() as conn:
        conn.execute(
            "INSERT INTO jobs (id, status, method, gap_min, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (jid, PENDING, method, gap_min, _now(), _now()),
        )
        conn.commit()
    return jid


def update_job(jid: str, **kwargs: Any) -> None:
    kwargs["updated_at"] = _now()
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    vals = list(kwargs.values()) + [jid]
    with _get_conn() as conn:
        conn.execute(f"UPDATE jobs SET {sets} WHERE id = ?", vals)
        conn.commit()


def get_job(jid: str) -> dict | None:
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (jid,)).fetchone()
    if row is None:
        return None
    d = dict(row)
    if d.get("result"):
        try:
            d["result"] = json.loads(d["result"])
        except Exception:
            pass
    return d


def list_jobs(limit: int = 50) -> list:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    result = []
    for row in rows:
        d = dict(row)
        if d.get("result"):
            try:
                d["result"] = json.loads(d["result"])
            except Exception:
                pass
        result.append(d)
    return result


def cancel_job(jid: str) -> bool:
    with _get_conn() as conn:
        row = conn.execute("SELECT status FROM jobs WHERE id = ?", (jid,)).fetchone()
        if row is None:
            return False
        if row["status"] in (DONE, FAILED, CANCELLED):
            return False
        conn.execute(
            "UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?",
            (CANCELLED, _now(), jid),
        )
        conn.commit()
    return True


# Registry of active asyncio tasks so we can cancel them
_running_tasks: dict[str, asyncio.Task] = {}


def register_task(jid: str, task: asyncio.Task) -> None:
    _running_tasks[jid] = task


def get_task(jid: str) -> asyncio.Task | None:
    return _running_tasks.get(jid)


def remove_task(jid: str) -> None:
    _running_tasks.pop(jid, None)


# Export helpers
def create_export(job_id: str, export_type: str) -> str:
    eid = uuid.uuid4().hex[:12]
    with _get_conn() as conn:
        conn.execute(
            "INSERT INTO exports (id, job_id, type, status, created_at) VALUES (?, ?, ?, ?, ?)",
            (eid, job_id, export_type, "pending", _now()),
        )
        conn.commit()
    return eid


def update_export(eid: str, **kwargs: Any) -> None:
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    vals = list(kwargs.values()) + [eid]
    with _get_conn() as conn:
        conn.execute(f"UPDATE exports SET {sets} WHERE id = ?", vals)
        conn.commit()


def get_export(eid: str) -> dict | None:
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM exports WHERE id = ?", (eid,)).fetchone()
    return dict(row) if row else None
