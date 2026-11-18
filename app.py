"""Streamlit web app for tracking personal expenses.

Run it from the project folder with:

    streamlit run app.py
"""

from datetime import date, datetime

import pandas as pd
import streamlit as st

import db

# Change this one constant if you ever want a different currency symbol.
CURRENCY = "R"


def money(amount: float) -> str:
    """Format a number as money, for example R 1,234.50."""
    return f"{CURRENCY} {amount:,.2f}"


def month_label(month: str) -> str:
    """Turn '2026-11' into 'November 2026' for the dropdown labels."""
    return datetime.strptime(month, "%Y-%m").strftime("%B %Y")


def month_options(all_label: str) -> dict[str, str | None]:
    """Build dropdown labels mapped to month values.

    The first option is the "show everything" choice and maps to None.
    Example: {"All months": None, "November 2026": "2026-11", ...}
    """
    options: dict[str, str | None] = {all_label: None}
    for month in db.distinct_months():
        options[month_label(month)] = month
    return options


def show_flash() -> None:
    """Show a one-time success message stored before a page rerun."""
    message = st.session_state.pop("flash", None)
    if message:
        st.success(message)


def add_entry_page() -> None:
    st.header("Add entry")

    with st.form("add_expense", clear_on_submit=True):
        amount = st.number_input(
            "Amount (R)", min_value=0.01, step=1.0, format="%.2f"
        )
        category = st.selectbox("Category", db.CATEGORIES)
        entry_date = st.date_input("Date", value=date.today())
        note = st.text_input("Note (optional)", max_chars=200)
        submitted = st.form_submit_button("Add expense")

    if submitted:
        # Stop amounts such as 1.999 before they reach the database.
        if round(amount, 2) != amount:
            st.error("Please use at most 2 decimal places (for example 12.50).")
            return

        new_id = db.add_expense(
            amount=amount,
            category=category,
            date=entry_date.isoformat(),
            note=note.strip(),
        )
        st.success(f"Added entry #{new_id}: {money(amount)} — {category}")


def view_entries_page() -> None:
    st.header("View entries")

    options = month_options("All months")
    category_options = ["All categories", *db.CATEGORIES]

    filter_col, category_col = st.columns(2)
    with filter_col:
        month_choice = st.selectbox("Month", list(options.keys()))
    with category_col:
        category_choice = st.selectbox("Category", category_options)

    month = options[month_choice]
    category = None if category_choice == "All categories" else category_choice

    rows = db.list_expenses(month=month, category=category)
    if not rows:
        st.info("No entries match these filters.")
        return

    table = pd.DataFrame(rows)
    table = table[["id", "date", "category", "amount", "note"]]
    table["amount"] = table["amount"].map(money)
    table["note"] = table["note"].replace("", "—")
    table = table.rename(
        columns={
            "id": "ID",
            "date": "Date",
            "category": "Category",
            "amount": "Amount",
            "note": "Note",
        }
    )

    st.dataframe(table, hide_index=True)

    total = sum(row["amount"] for row in rows)
    entry_word = "entry" if len(rows) == 1 else "entries"
    st.caption(f"{len(rows)} {entry_word} — total {money(total)}")


def delete_entry_page() -> None:
    st.header("Delete entry")

    expense_id = int(
        st.number_input("Entry ID", min_value=1, step=1, value=1)
    )
    entry = db.get_expense(expense_id)

    if entry is None:
        st.info("No entry with that ID. Check the ID on the View entries page.")
        return

    st.write(f"**Entry #{entry['id']}**")
    st.write(f"Date: {entry['date']}")
    st.write(f"Category: {entry['category']}")
    st.write(f"Amount: {money(entry['amount'])}")
    st.write(f"Note: {entry['note'] or '—'}")
    st.warning("Deleting is permanent. There is no undo.")

    if st.button("Delete this entry", type="primary"):
        db.delete_expense(expense_id)
        st.session_state["flash"] = f"Deleted entry #{expense_id}."
        st.rerun()


def statistics_page() -> None:
    st.header("Statistics")

    options = month_options("All time")
    period_choice = st.selectbox("Period", list(options.keys()))
    month = options[period_choice]

    stats = db.category_stats(month=month)
    if not stats:
        st.info("No entries to summarise for this period.")
        return

    # Start from all six categories so the table always has the same shape.
    table = pd.DataFrame({"category": db.CATEGORIES}).merge(
        pd.DataFrame(stats), on="category", how="left"
    )
    table["total"] = table["total"].fillna(0.0)
    table["count"] = table["count"].fillna(0).astype(int)

    overall_total = table["total"].sum()
    table["share"] = (table["total"] / overall_total * 100).round(1)
    table = table.sort_values("total", ascending=False)

    chart_data = (
        table[table["total"] > 0]
        .set_index("category")["total"]
        .rename("Total")
    )
    st.bar_chart(chart_data, height=350)

    entry_word = "entry" if table["count"].sum() == 1 else "entries"
    st.caption(
        f"{period_choice} — total {money(overall_total)} "
        f"across {int(table['count'].sum())} {entry_word}."
    )

    display = table.assign(
        total=table["total"].map(money),
        share=table["share"].map(lambda value: f"{value:.1f}%"),
    ).rename(
        columns={
            "category": "Category",
            "total": "Total",
            "count": "Entries",
            "share": "Share",
        }
    )
    st.dataframe(display, hide_index=True)


def main() -> None:
    st.set_page_config(page_title="Expense Tracker", page_icon="💰", layout="centered")
    db.init_db()

    st.sidebar.title("Expense Tracker")
    page = st.sidebar.radio(
        "Go to",
        ["Add entry", "View entries", "Delete entry", "Statistics"],
    )

    show_flash()

    if page == "Add entry":
        add_entry_page()
    elif page == "View entries":
        view_entries_page()
    elif page == "Delete entry":
        delete_entry_page()
    else:
        statistics_page()


if __name__ == "__main__":
    main()