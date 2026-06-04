import sqlite3
import uuid
from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_all(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM deck ORDER BY title"
    ).fetchall()


def get_by_id(conn: sqlite3.Connection, deck_id: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM deck WHERE id = ?", (deck_id,)
    ).fetchone()


def get_by_title(conn: sqlite3.Connection, title: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM deck WHERE title = ?", (title,)
    ).fetchone()


def insert(conn: sqlite3.Connection, title: str, source_file: str) -> str:
    deck_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO deck (id, title, source_file, created_at) VALUES (?, ?, ?, ?)",
        (deck_id, title, source_file, _now()),
    )
    return deck_id


def update_last_studied(conn: sqlite3.Connection, deck_id: str) -> None:
    conn.execute(
        "UPDATE deck SET last_studied = ? WHERE id = ?",
        (_now(), deck_id),
    )


def delete(conn: sqlite3.Connection, deck_id: str) -> None:
    conn.execute("DELETE FROM deck WHERE id = ?", (deck_id,))
