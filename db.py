"""All database code for the expense tracker.

The Streamlit UI in app.py calls these functions. Nothing in this file
knows about Streamlit, which keeps the database logic easy to read and test.
"""

import sqlite3
from pathlib import Path

# The six categories the app allows. app.py imports this tuple for its dropdowns.
CATEGORIES = (
    "Food & Drink",
    "Transport",
    "Shopping",
    "Entertainment",
    "Housing",
    "Other",
)

# The database file lives next to this Python file.
DB_PATH = Path(__file__).with_name("expenses.db")

# Build the CHECK constraint from CATEGORIES so the list exists in one place.
# These are fixed strings from our own code, never user input.
_CATEGORY_CHECK = ", ".join(f"'{category}'" for category in CATEGORIES)


def get_connection() -> sqlite3.Connection:
    """Open a new connection to the database.

    Opening a short-lived connection for each function call keeps the app
    safe when Streamlit reruns the script, even from different threads.
    """
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    """Create the expenses table if it does not exist yet.

    Calling this on every app start is safe: the SQL uses IF NOT EXISTS.
    """
    connection = get_connection()
    try:
        connection.execute(
            f"""
            CREATE TABLE IF NOT EXISTS expenses (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                amount   REAL    NOT NULL CHECK (amount > 0),
                category TEXT    NOT NULL CHECK (category IN ({_CATEGORY_CHECK})),
                date     TEXT    NOT NULL,
                note     TEXT    NOT NULL DEFAULT ''
            )
            """
        )
        connection.commit()
    finally:
        connection.close()


def add_expense(amount: float, category: str, date: str, note: str = "") -> int:
    """Save one expense and return its new database ID."""
    connection = get_connection()
    try:
        cursor = connection.execute(
            "INSERT INTO expenses (amount, category, date, note) VALUES (?, ?, ?, ?)",
            (amount, category, date, note.strip()),
        )
        connection.commit()
        return cursor.lastrowid
    finally:
        connection.close()


def get_expense(expense_id: int) -> dict | None:
    """Return one expense as a dictionary, or None if the ID does not exist."""
    connection = get_connection()
    try:
        row = connection.execute(
            "SELECT id, amount, category, date, note FROM expenses WHERE id = ?",
            (expense_id,),
        ).fetchone()
    finally:
        connection.close()
    return dict(row) if row else None


def list_expenses(month: str | None = None, category: str | None = None) -> list[dict]:
    """Return expenses, newest first, with optional month and category filters.

    `month` is a string like "2026-11". Both filters use SQL placeholders,
    so user input is never pasted directly into the query.
    """
    query = "SELECT id, amount, category, date, note FROM expenses"
    conditions = []
    parameters = []

    if month:
        conditions.append("substr(date, 1, 7) = ?")
        parameters.append(month)
    if category:
        conditions.append("category = ?")
        parameters.append(category)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY date DESC, id DESC"

    connection = get_connection()
    try:
        rows = connection.execute(query, parameters).fetchall()
    finally:
        connection.close()
    return [dict(row) for row in rows]


def delete_expense(expense_id: int) -> bool:
    """Delete one expense. Return True if a row was deleted, False if not found."""
    connection = get_connection()
    try:
        cursor = connection.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
        connection.commit()
        return cursor.rowcount > 0
    finally:
        connection.close()


def distinct_months() -> list[str]:
    """Return the months that have expenses, newest first, e.g. ['2026-11', '2026-10']."""
    connection = get_connection()
    try:
        rows = connection.execute(
            "SELECT DISTINCT substr(date, 1, 7) AS month "
            "FROM expenses ORDER BY month DESC"
        ).fetchall()
    finally:
        connection.close()
    return [row["month"] for row in rows]


def category_stats(month: str | None = None) -> list[dict]:
    """Return total spending and entry count per category.

    Pass a month like "2026-11" to limit the statistics to that month.
    Categories with no entries are left out; the UI fills those in with zero.
    """
    query = (
        "SELECT category, ROUND(SUM(amount), 2) AS total, COUNT(*) AS count "
        "FROM expenses"
    )
    parameters = []
    if month:
        query += " WHERE substr(date, 1, 7) = ?"
        parameters.append(month)
    query += " GROUP BY category ORDER BY total DESC"

    connection = get_connection()
    try:
        rows = connection.execute(query, parameters).fetchall()
    finally:
        connection.close()
    return [dict(row) for row in rows]