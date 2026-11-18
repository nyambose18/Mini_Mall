# Expense Tracker

A small web app that keeps track of your personal spending on your own computer.
It is built with Python, Streamlit (the web page), and SQLite (the database file).

## What each file does

| File | What it is |
|---|---|
| `app.py` | The web page: Add, View, Delete, and Statistics screens. |
| `db.py` | All the database code. `app.py` calls these functions. |
| `test_db.py` | Automated checks that the database code behaves correctly. |
| `requirements.txt` | The two Python packages the app needs. |
| `expenses.db` | Your data. Created automatically the first time you run the app. Do not edit it by hand. |

## First-time setup

You need Python 3.10 or newer. Open a terminal in the project folder
(`d:\ai-coding-projects`).

**PowerShell:**

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
```

**Git Bash:**

```bash
python -m venv .venv
source .venv/Scripts/activate
python -m pip install -r requirements.txt
```

The first command creates a private Python environment in `.venv`, so this app's
packages do not interfere with anything else on your computer. You only need to
do this setup once.

If PowerShell refuses to run the activation line, either run
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt
and run `.venv\Scripts\activate.bat` instead.

## Run the app

With the environment activated, run:

```bash
python -m streamlit run app.py
```

Your browser should open at <http://localhost:8501>. If it does not, copy that
address into your browser. To stop the app, return to the terminal and press
`Ctrl+C`.

Next time, you only need to activate the environment and run the same
`streamlit run app.py` command — no need to reinstall anything.

## Using the app

- **Add entry** — enter an amount, pick a category and date, and add an optional
  note. The form clears itself so you can add the next expense straight away.
- **View entries** — see your entries in a table, newest first. Filter by month,
  category, or both. The caption underneath shows the number of entries and the
  total for the current filters.
- **Delete entry** — type the ID shown in the View table. The app shows the entry
  so you can check it is the right one, then asks you to confirm the deletion.
- **Statistics** — pick a period ("All time" or a single month) to see a bar chart
  and a summary table with each category's total and share of your spending.

## Where your data lives

Everything is stored in `expenses.db` in this folder. Nothing is sent to the
internet. To back up your data, copy that file somewhere safe.

To start over with an empty tracker, stop the app, delete `expenses.db`, and
start the app again. It will create a fresh database.

## Run the tests

The tests use their own temporary database, so your real entries are untouched:

```bash
python -m unittest -v test_db
```

## Small changes you might want

- **Currency symbol:** edit `CURRENCY = "R"` near the top of `app.py`.
- **Categories:** edit the `CATEGORIES` tuple at the top of `db.py`. If you have
  already saved entries, the old categories stay in the database; changing the
  list only affects new entries and the dropdowns.
- **There is no edit button.** To correct an entry, delete it and add it again.

## Why there is no login

This app is meant to run locally for one person. It has no accounts or passwords,
and it should not be put on a public web server as-is.