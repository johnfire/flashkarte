import sqlite3
import uuid
from datetime import date, datetime, timezone

from flashmd.sm2.algorithm import SM2Progress, calculate


def _today() -> str:
    return date.today().isoformat()


def _tomorrow() -> str:
    from datetime import timedelta
    return (date.today() + timedelta(days=1)).isoformat()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_progress(conn: sqlite3.Connection, card_id: str) -> None:
    """Create a default CardProgress for a new card. due_date = tomorrow."""
    prog_id = str(uuid.uuid4())
    conn.execute(
        "INSERT OR IGNORE INTO card_progress "
        "(id, card_id, easiness, interval, repetitions, due_date) "
        "VALUES (?, ?, 2.5, 0, 0, ?)",
        (prog_id, card_id, _tomorrow()),
    )


def reset_progress(conn: sqlite3.Connection, card_id: str) -> None:
    """Reset SM-2 state for a card whose content changed."""
    conn.execute(
        "UPDATE card_progress "
        "SET easiness=2.5, interval=0, repetitions=0, due_date=?, "
        "    last_reviewed=NULL, last_rating=NULL "
        "WHERE card_id=?",
        (_tomorrow(), card_id),
    )


def get_due_cards(
    conn: sqlite3.Connection, deck_id: str
) -> list[sqlite3.Row]:
    """Return cards due today or earlier, joined with progress, ordered by due_date."""
    return conn.execute(
        """
        SELECT c.id, c.front, c.back,
               cp.id AS progress_id, cp.easiness, cp.interval,
               cp.repetitions, cp.due_date, cp.last_reviewed, cp.last_rating
        FROM card c
        JOIN card_progress cp ON cp.card_id = c.id
        WHERE c.deck_id = ?
          AND cp.due_date <= ?
        ORDER BY cp.due_date ASC
        """,
        (deck_id, _today()),
    ).fetchall()


def get_progress(conn: sqlite3.Connection, card_id: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM card_progress WHERE card_id = ?", (card_id,)
    ).fetchone()


def apply_rating(conn: sqlite3.Connection, card_id: str, rating: int) -> None:
    """Run SM-2, persist result, update due_date."""
    row = get_progress(conn, card_id)
    if row is None:
        raise ValueError(f"No CardProgress for card {card_id}")

    progress = SM2Progress(
        easiness=row["easiness"],
        interval=row["interval"],
        repetitions=row["repetitions"],
    )
    result = calculate(progress, rating)

    from datetime import timedelta
    new_due = (date.today() + timedelta(days=result.interval)).isoformat()

    conn.execute(
        "UPDATE card_progress "
        "SET easiness=?, interval=?, repetitions=?, due_date=?, "
        "    last_reviewed=?, last_rating=? "
        "WHERE card_id=?",
        (
            result.easiness,
            result.interval,
            result.repetitions,
            new_due,
            _now(),
            rating,
            card_id,
        ),
    )


def get_stats(conn: sqlite3.Connection, deck_id: str) -> dict:
    """Return summary stats for a deck."""
    total = conn.execute(
        "SELECT COUNT(*) FROM card WHERE deck_id = ?", (deck_id,)
    ).fetchone()[0]

    due = conn.execute(
        "SELECT COUNT(*) FROM card c "
        "JOIN card_progress cp ON cp.card_id = c.id "
        "WHERE c.deck_id = ? AND cp.due_date <= ?",
        (deck_id, _today()),
    ).fetchone()[0]

    ratings = conn.execute(
        "SELECT last_rating, COUNT(*) as cnt "
        "FROM card_progress cp "
        "JOIN card c ON c.id = cp.card_id "
        "WHERE c.deck_id = ? AND cp.last_rating IS NOT NULL "
        "GROUP BY last_rating",
        (deck_id,),
    ).fetchall()

    rating_counts = {r["last_rating"]: r["cnt"] for r in ratings}

    return {
        "total": total,
        "due": due,
        "rating_counts": rating_counts,
    }
