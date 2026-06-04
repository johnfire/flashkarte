import sqlite3
from pathlib import Path


def get_db_path() -> Path:
    data_dir = Path.home() / ".local" / "share" / "flashmd"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "flashmd.db"


def get_connection(db_path: Path | None = None) -> sqlite3.Connection:
    path = db_path or get_db_path()
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS deck (
            id          TEXT PRIMARY KEY,
            title       TEXT NOT NULL,
            source_file TEXT NOT NULL,
            created_at  TEXT NOT NULL,
            last_studied TEXT
        );

        CREATE TABLE IF NOT EXISTS category (
            id          TEXT PRIMARY KEY,
            deck_id     TEXT NOT NULL REFERENCES deck(id) ON DELETE CASCADE,
            name        TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS card (
            id          TEXT PRIMARY KEY,
            deck_id     TEXT NOT NULL REFERENCES deck(id) ON DELETE CASCADE,
            category_id TEXT REFERENCES category(id) ON DELETE SET NULL,
            front       TEXT NOT NULL,
            back        TEXT NOT NULL,
            created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS card_progress (
            id            TEXT PRIMARY KEY,
            card_id       TEXT NOT NULL UNIQUE REFERENCES card(id) ON DELETE CASCADE,
            easiness      REAL NOT NULL DEFAULT 2.5,
            interval      INTEGER NOT NULL DEFAULT 0,
            repetitions   INTEGER NOT NULL DEFAULT 0,
            due_date      TEXT NOT NULL,
            last_reviewed TEXT,
            last_rating   INTEGER
        );
    """)
    conn.commit()
