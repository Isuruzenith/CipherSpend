"""
SQLite persistence layer for CipherSpend.

Only ciphertext BLOBs and plaintext metadata (description, timestamp) are
stored.  Plaintext amounts are never written to disk.
"""
import sqlite3
from typing import Any

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS expenses (
    id          TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    timestamp   TEXT NOT NULL,
    ciphertext  BLOB NOT NULL
)
"""


def init_db(path: str) -> sqlite3.Connection:
    """Open (or create) the SQLite database and ensure the schema exists."""
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.execute(_CREATE_TABLE)
    conn.commit()
    return conn


def save_expense(
    conn: sqlite3.Connection,
    expense_id: str,
    description: str,
    timestamp: str,
    ciphertext: bytes,
) -> None:
    conn.execute(
        "INSERT INTO expenses (id, description, timestamp, ciphertext) VALUES (?,?,?,?)",
        (expense_id, description, timestamp, ciphertext),
    )
    conn.commit()


def get_expenses(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """Return all expenses ordered by timestamp ascending."""
    rows = conn.execute(
        "SELECT id, description, timestamp, ciphertext FROM expenses ORDER BY timestamp"
    ).fetchall()
    return [
        {"id": r[0], "description": r[1], "timestamp": r[2], "ciphertext": r[3]}
        for r in rows
    ]


def delete_expense(conn: sqlite3.Connection, expense_id: str) -> None:
    conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    conn.commit()
