"""Tests for the database functions in db.py.

Run them from the project folder with:

    python -m unittest -v test_db
"""

import sqlite3
import tempfile
import unittest
from pathlib import Path

import db


class ExpenseDatabaseTests(unittest.TestCase):
    def setUp(self) -> None:
        # Each test gets its own empty database file, so tests cannot affect
        # your real expenses.db.
        self._temp_dir = tempfile.TemporaryDirectory()
        self._original_db_path = db.DB_PATH
        db.DB_PATH = Path(self._temp_dir.name) / "test_expenses.db"
        db.init_db()

    def tearDown(self) -> None:
        db.DB_PATH = self._original_db_path
        self._temp_dir.cleanup()

    def test_add_and_list_newest_first(self) -> None:
        first_id = db.add_expense(10.50, "Food & Drink", "2026-10-05", "Breakfast")
        second_id = db.add_expense(20.00, "Transport", "2026-11-02", "Bus")

        rows = db.list_expenses()

        self.assertEqual(first_id, 1)
        self.assertEqual([row["id"] for row in rows], [second_id, first_id])
        self.assertEqual(rows[0]["category"], "Transport")

    def test_month_and_category_filters(self) -> None:
        db.add_expense(10.0, "Food & Drink", "2026-10-05", "")
        db.add_expense(20.0, "Transport", "2026-10-06", "")
        db.add_expense(30.0, "Food & Drink", "2026-11-01", "")

        self.assertEqual(len(db.list_expenses(category="Food & Drink")), 2)
        self.assertEqual(len(db.list_expenses(month="2026-10")), 2)

        combined = db.list_expenses(month="2026-10", category="Food & Drink")
        self.assertEqual(len(combined), 1)
        self.assertEqual(combined[0]["amount"], 10.0)

    def test_category_stats(self) -> None:
        db.add_expense(10.0, "Food & Drink", "2026-10-05", "")
        db.add_expense(5.5, "Food & Drink", "2026-10-06", "")
        db.add_expense(7.0, "Transport", "2026-11-01", "")

        by_category = {row["category"]: row for row in db.category_stats()}

        self.assertEqual(by_category["Food & Drink"]["total"], 15.5)
        self.assertEqual(by_category["Food & Drink"]["count"], 2)
        self.assertEqual(by_category["Transport"]["total"], 7.0)

        october = {
            row["category"]: row for row in db.category_stats(month="2026-10")
        }
        self.assertNotIn("Transport", october)

    def test_get_and_delete(self) -> None:
        expense_id = db.add_expense(10.0, "Other", "2026-11-01", "")

        self.assertIsNotNone(db.get_expense(expense_id))
        self.assertTrue(db.delete_expense(expense_id))
        self.assertFalse(db.delete_expense(expense_id))
        self.assertIsNone(db.get_expense(expense_id))

    def test_database_rejects_invalid_rows(self) -> None:
        with self.assertRaises(sqlite3.IntegrityError):
            db.add_expense(0, "Other", "2026-11-01", "")

        with self.assertRaises(sqlite3.IntegrityError):
            db.add_expense(10.0, "Groceries", "2026-11-01", "")


if __name__ == "__main__":
    unittest.main()