import sqlite3
import uuid
from datetime import datetime, timezone

from flashmd.parser.md_parser import ParsedDeck


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Category ──────────────────────────────────────────────────────────────────

def insert_category(
    conn: sqlite3.Connection, deck_id: str, name: str, order_index: int
) -> str:
    cat_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO category (id, deck_id, name, order_index) VALUES (?, ?, ?, ?)",
        (cat_id, deck_id, name, order_index),
    )
    return cat_id


def get_categories(conn: sqlite3.Connection, deck_id: str) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM category WHERE deck_id = ? ORDER BY order_index",
        (deck_id,),
    ).fetchall()


def delete_categories(conn: sqlite3.Connection, deck_id: str) -> None:
    conn.execute("DELETE FROM category WHERE deck_id = ?", (deck_id,))


# ── Card ───────────────────────────────────────────────────────────────────────

def insert_card(
    conn: sqlite3.Connection,
    deck_id: str,
    category_id: str | None,
    front: str,
    back: str,
) -> str:
    card_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO card (id, deck_id, category_id, front, back, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (card_id, deck_id, category_id, front, back, _now()),
    )
    return card_id


def get_cards(conn: sqlite3.Connection, deck_id: str) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM card WHERE deck_id = ? ORDER BY rowid",
        (deck_id,),
    ).fetchall()


def get_card_by_front(
    conn: sqlite3.Connection, deck_id: str, front: str
) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM card WHERE deck_id = ? AND front = ?",
        (deck_id, front),
    ).fetchone()


def update_card_back(conn: sqlite3.Connection, card_id: str, back: str) -> None:
    conn.execute("UPDATE card SET back = ? WHERE id = ?", (back, card_id))


def delete_cards_not_in(
    conn: sqlite3.Connection, deck_id: str, keep_fronts: list[str]
) -> list[str]:
    """Delete cards whose front is not in keep_fronts. Returns deleted card IDs."""
    placeholders = ",".join("?" * len(keep_fronts))
    rows = conn.execute(
        f"SELECT id FROM card WHERE deck_id = ? AND front NOT IN ({placeholders})",
        [deck_id, *keep_fronts],
    ).fetchall()
    deleted_ids = [r["id"] for r in rows]
    if deleted_ids:
        id_placeholders = ",".join("?" * len(deleted_ids))
        conn.execute(
            f"DELETE FROM card WHERE id IN ({id_placeholders})", deleted_ids
        )
    return deleted_ids


# ── Import (upsert deck contents) ─────────────────────────────────────────────

def upsert_deck_contents(
    conn: sqlite3.Connection, deck_id: str, parsed: ParsedDeck
) -> dict[str, str]:
    """
    Synchronise parsed deck into the DB for an existing deck_id.

    Returns a dict mapping card front → card_id for all cards now in the deck.
    Cards whose back changed have their CardProgress reset (done in progress_repo).
    The caller is responsible for committing.

    Returns: {front: card_id, ...}, and a set of fronts whose back changed.
    """
    # Rebuild categories (order may have changed)
    delete_categories(conn, deck_id)
    category_map: dict[str | None, str | None] = {None: None}
    seen_categories: dict[str, str] = {}
    for idx, card in enumerate(parsed.cards):
        cat = card.category
        if cat and cat not in seen_categories:
            cat_id = insert_category(conn, deck_id, cat, len(seen_categories))
            seen_categories[cat] = cat_id
        category_map[cat] = seen_categories.get(cat)

    new_fronts = [c.front for c in parsed.cards]
    delete_cards_not_in(conn, deck_id, new_fronts)

    result: dict[str, str] = {}
    changed_fronts: set[str] = set()

    for card in parsed.cards:
        existing = get_card_by_front(conn, deck_id, card.front)
        cat_id = category_map.get(card.category)
        if existing is None:
            card_id = insert_card(conn, deck_id, cat_id, card.front, card.back)
            changed_fronts.add(card.front)  # new card, needs progress init
        else:
            card_id = existing["id"]
            if existing["back"] != card.back:
                update_card_back(conn, card_id, card.back)
                changed_fronts.add(card.front)
        result[card.front] = card_id

    return result, changed_fronts
