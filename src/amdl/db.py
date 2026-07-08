"""SQLite 数据库层 —— 任务历史和下载记录持久化"""
from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from typing import Any

DB_DIR = Path.home() / ".amdl"
DB_PATH = DB_DIR / "amdl.db"


def _get_conn() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    """创建数据库表（如果不存在）"""
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS tasks (
            id          TEXT PRIMARY KEY,
            urls        TEXT NOT NULL,          -- JSON array
            status      TEXT NOT NULL DEFAULT 'pending',
            progress    INTEGER NOT NULL DEFAULT 0,  -- 0-100
            total       INTEGER NOT NULL DEFAULT 0,
            completed   INTEGER NOT NULL DEFAULT 0,
            error_count INTEGER NOT NULL DEFAULT 0,
            output_path TEXT NOT NULL DEFAULT './Apple Music',
            audio_format TEXT,
            video_format TEXT,
            logs        TEXT NOT NULL DEFAULT '[]',   -- JSON array of log lines
            created_at  REAL NOT NULL,
            updated_at  REAL NOT NULL
        );
    """)
    conn.commit()
    conn.close()


# ── Task CRUD ──────────────────────────────────────────────────

def create_task(
    task_id: str,
    urls: list[str],
    output_path: str = "./Apple Music",
    audio_format: str | None = None,
    video_format: str | None = None,
) -> None:
    conn = _get_conn()
    now = time.time()
    conn.execute(
        """INSERT INTO tasks (id, urls, status, output_path, audio_format, video_format, created_at, updated_at)
           VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)""",
        (task_id, json.dumps(urls), output_path, audio_format, video_format, now, now),
    )
    conn.commit()
    conn.close()


def update_task_status(task_id: str, status: str) -> None:
    conn = _get_conn()
    conn.execute(
        "UPDATE tasks SET status=?, updated_at=? WHERE id=?",
        (status, time.time(), task_id),
    )
    conn.commit()
    conn.close()


def update_task_progress(
    task_id: str,
    progress: int,
    completed: int,
    total: int,
    error_count: int = 0,
) -> None:
    conn = _get_conn()
    conn.execute(
        """UPDATE tasks SET progress=?, completed=?, total=?, error_count=?, updated_at=?
           WHERE id=?""",
        (progress, completed, total, error_count, time.time(), task_id),
    )
    conn.commit()
    conn.close()


def append_task_log(task_id: str, msg: str) -> None:
    conn = _get_conn()
    row = conn.execute("SELECT logs FROM tasks WHERE id=?", (task_id,)).fetchone()
    if row:
        logs = json.loads(row["logs"])
        logs.append(msg)
        # 只保留最近 500 条日志
        if len(logs) > 500:
            logs = logs[-500:]
        conn.execute(
            "UPDATE tasks SET logs=?, updated_at=? WHERE id=?",
            (json.dumps(logs), time.time(), task_id),
        )
        conn.commit()
    conn.close()


def get_task(task_id: str) -> dict[str, Any] | None:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    conn.close()
    if row is None:
        return None
    return _row_to_dict(row)


def list_tasks(status: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    conn = _get_conn()
    if status:
        rows = conn.execute(
            "SELECT * FROM tasks WHERE status=? ORDER BY created_at DESC LIMIT ?",
            (status, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def delete_task(task_id: str) -> bool:
    conn = _get_conn()
    cursor = conn.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def clear_history() -> int:
    """清空所有任务（包括待处理、下载中、已完成、失败），返回删除数量"""
    conn = _get_conn()
    cursor = conn.execute("DELETE FROM tasks")
    conn.commit()
    count = cursor.rowcount
    conn.close()
    return count


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    d["urls"] = json.loads(d["urls"])
    d["logs"] = json.loads(d["logs"])
    return d
