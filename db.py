"""
SQLite persistence layer for CipherSpend.

Only ciphertext BLOBs and plaintext metadata (description, timestamp) are
stored.  Plaintext amounts are never written to disk.
"""
import os
import sqlite3
import tempfile
from typing import Any

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS expenses (
    id          TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    timestamp   TEXT NOT NULL,
    ciphertext  BLOB NOT NULL,
    category    TEXT NOT NULL DEFAULT 'Default',
    is_deleted  INTEGER DEFAULT 0
)
"""
_BASE_COLUMNS = {"id", "description", "timestamp", "ciphertext"}
_EXPECTED_COLUMNS = {"id", "description", "timestamp", "ciphertext", "category", "is_deleted"}


def init_db(path: str) -> sqlite3.Connection:
    """Open (or create) the SQLite database and ensure the schema exists."""
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.execute(_CREATE_TABLE)
    _migrate_schema(conn)
    conn.commit()
    return conn


def _migrate_schema(conn: sqlite3.Connection) -> None:
    columns = {
        row[1]
        for row in conn.execute("PRAGMA table_info(expenses)").fetchall()
    }
    if "category" not in columns:
        conn.execute(
            "ALTER TABLE expenses ADD COLUMN category TEXT NOT NULL DEFAULT 'Default'"
        )
    if "is_deleted" not in columns:
        conn.execute(
            "ALTER TABLE expenses ADD COLUMN is_deleted INTEGER DEFAULT 0"
        )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_expenses_timestamp ON expenses(timestamp)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)"
    )
    
    conn.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )
    """)
    count = conn.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
    if count == 0:
        default_categories = ["Default", "Food & Dining", "Transportation", "Shopping", "Entertainment", "Bills & Utilities"]
        for cat in default_categories:
            conn.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (cat,))


def save_expense(
    conn: sqlite3.Connection,
    expense_id: str,
    description: str,
    timestamp: str,
    ciphertext: bytes,
    category: str,
) -> None:
    conn.execute(
        "INSERT INTO expenses (id, description, timestamp, ciphertext, category) VALUES (?,?,?,?,?)",
        (expense_id, description, timestamp, ciphertext, category),
    )
    conn.commit()


def get_expenses(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    """Return all active expenses ordered by timestamp ascending."""
    rows = conn.execute(
        "SELECT id, description, timestamp, ciphertext, category FROM expenses WHERE is_deleted = 0 ORDER BY timestamp"
    ).fetchall()
    return [
        {
            "id": r[0],
            "description": r[1],
            "timestamp": r[2],
            "ciphertext": r[3],
            "category": r[4] or "Default",
        }
        for r in rows
    ]


def get_expenses_filtered(
    conn: sqlite3.Connection,
    start_iso: str | None = None,
    end_iso: str | None = None,
    category: str | None = None,
) -> list[dict[str, Any]]:
    sql = "SELECT id, description, timestamp, ciphertext, category FROM expenses WHERE is_deleted = 0"
    params: list[Any] = []
    if start_iso is not None:
        sql += " AND timestamp >= ?"
        params.append(start_iso)
    if end_iso is not None:
        sql += " AND timestamp <= ?"
        params.append(end_iso)
    if category and category != "All":
        sql += " AND category = ?"
        params.append(category)
    sql += " ORDER BY timestamp"
    rows = conn.execute(sql, params).fetchall()
    return [
        {
            "id": r[0],
            "description": r[1],
            "timestamp": r[2],
            "ciphertext": r[3],
            "category": r[4] or "Default",
        }
        for r in rows
    ]


def get_distinct_categories(conn: sqlite3.Connection) -> list[str]:
    # Changed to read from categories table instead of looking at expenses
    rows = conn.execute(
        "SELECT name FROM categories ORDER BY id"
    ).fetchall()
    mapped = [r[0] for r in rows]
    return mapped

def add_category(conn: sqlite3.Connection, name: str) -> None:
    conn.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (name,))
    conn.commit()

def remove_category(conn: sqlite3.Connection, name: str) -> None:
    conn.execute("DELETE FROM categories WHERE name = ?", (name,))
    conn.commit()


def soft_delete_expense(conn: sqlite3.Connection, expense_id: str) -> None:
    conn.execute("UPDATE expenses SET is_deleted = 1 WHERE id = ?", (expense_id,))
    conn.commit()

def restore_expense(conn: sqlite3.Connection, expense_id: str) -> None:
    conn.execute("UPDATE expenses SET is_deleted = 0 WHERE id = ?", (expense_id,))
    conn.commit()

def get_deleted_expenses(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT id, description, timestamp, ciphertext, category FROM expenses WHERE is_deleted = 1 ORDER BY timestamp DESC"
    ).fetchall()
    return [
        {
            "id": r[0],
            "description": r[1],
            "timestamp": r[2],
            "ciphertext": r[3],
            "category": r[4] or "Default",
        }
        for r in rows
    ]

def delete_expense(conn: sqlite3.Connection, expense_id: str) -> None:
    # Now treated as hard_delete
    conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    conn.commit()

def update_expense(conn: sqlite3.Connection, expense_id: str, description: str, category: str) -> None:
    conn.execute(
        "UPDATE expenses SET description = ?, category = ? WHERE id = ?",
        (description, category, expense_id),
    )
    conn.commit()


def export_ledger_sql_dump(conn: sqlite3.Connection) -> bytes:
    """Return a UTF-8 SQLite SQL dump of the encrypted ledger."""
    dump_sql = "\n".join(conn.iterdump()) + "\n"
    return dump_sql.encode("utf-8")


def _has_expected_schema(conn: sqlite3.Connection) -> bool:
    rows = conn.execute("PRAGMA table_info(expenses)").fetchall()
    cols = {r[1] for r in rows}
    return _EXPECTED_COLUMNS.issubset(cols)


def is_valid_ledger_bytes(db_bytes: bytes) -> bool:
    """
    Validate uploaded SQLite bytes by checking they open, pass PRAGMA integrity_check,
    and include the exact expected CipherSpend schema.
    """
    if not db_bytes:
        return False

    tmp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".db") as tmp:
            tmp.write(db_bytes)
            tmp_path = tmp.name
        conn = sqlite3.connect(tmp_path)
        try:
            integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
            if integrity.lower() != "ok":
                return False
            return _has_expected_schema(conn)
        finally:
            conn.close()
    except sqlite3.Error:
        return False
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass



def restore_ledger_file_from_bytes(db_bytes: bytes, target_path: str) -> None:
    """
    Atomically replace the on-disk ledger with validated SQLite bytes.
    Raises ValueError for invalid data.
    """
    if not is_valid_ledger_bytes(db_bytes):
        raise ValueError("Invalid CipherSpend ledger file.")

    tmp_path = ""
    try:
        target_dir = os.path.dirname(os.path.abspath(target_path))
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".db", dir=target_dir
        ) as tmp:
            tmp.write(db_bytes)
            tmp_path = tmp.name
        os.replace(tmp_path, target_path)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
