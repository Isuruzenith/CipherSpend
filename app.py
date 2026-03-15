"""
CipherSpend — zero-knowledge expense tracker.

Amounts are encrypted via CKKS homomorphic encryption before any storage.
Only the final homomorphically-summed ciphertext is decrypted for display.

Run with:  streamlit run app.py
"""
import hashlib
import os
import uuid
from datetime import datetime, date
from html import escape

import streamlit as st

# ── Page config (must be first Streamlit call) ────────────────────────────────
st.set_page_config(
    page_title="CipherSpend",
    page_icon="🔐",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown(
    """
<style>
  /* Hide Streamlit chrome */
  #MainMenu, footer, header[data-testid="stHeader"],
  div[data-testid="stToolbar"], .stDeployButton { display: none !important; }

  /* Layout */
  .main .block-container {
    max-width: 800px;
    padding: 2.5rem 1.5rem 5rem;
  }

  /* App header */
  .cs-title {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: #eeeeee;
    letter-spacing: -0.4px;
    margin: 0 0 2px;
  }
  .cs-subtitle {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    color: #555;
    margin: 0 0 2rem;
  }

  /* Key info strip */
  .cs-key-info {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    color: #556;
    padding: 8px 12px;
    background: #0f1a14;
    border-left: 3px solid #44aa88;
    border-radius: 2px;
    margin-bottom: 1.5rem;
  }

  /* Warning / notice band */
  .cs-warn {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    color: #cc9944;
    padding: 10px 14px;
    background: #1a1500;
    border: 1px solid #332200;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  /* Divider */
  .cs-divider { border: none; border-top: 1px solid #1e1e1e; margin: 1.5rem 0; }

  /* Expense table */
  .cs-table {
    width: 100%;
    border-collapse: collapse;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    color: #ccc;
    margin: 0.5rem 0 1.5rem;
  }
  .cs-table th {
    text-align: left;
    padding: 7px 10px;
    border-bottom: 1px solid #242424;
    color: #555;
    font-weight: 500;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .cs-table td {
    padding: 10px 10px;
    border-bottom: 1px solid #161616;
    vertical-align: middle;
  }
  .cs-table tr:hover td { background: #0f0f0f; }

  /* Encrypted value badge */
  .cipher-val {
    display: inline-block;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    background: #141a14;
    color: #5a9a70;
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid #1e2e1e;
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: default;
    letter-spacing: 0.03em;
  }

  /* Total display */
  .cs-total-label {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 11px;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 1rem 0 4px;
  }
  .cs-total {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 36px;
    font-weight: 700;
    color: #44aa88;
    margin: 0 0 0.5rem;
  }
  .cs-total-meta {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    color: #444;
  }

  /* Override primary button */
  div.stButton > button[kind="primary"],
  div.stButton > button {
    background: #44aa88 !important;
    color: #000 !important;
    border: none !important;
    font-weight: 600 !important;
    letter-spacing: 0.02em !important;
    border-radius: 4px !important;
  }
  div.stButton > button:hover {
    background: #55bb99 !important;
    color: #000 !important;
  }

  /* Empty state */
  .cs-empty {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    color: #2e2e2e;
    text-align: center;
    padding: 2.5rem 0;
  }
</style>
""",
    unsafe_allow_html=True,
)

# ── Dependency check ──────────────────────────────────────────────────────────
try:
    from crypto import (
        create_context,
        ciphertext_to_display,
        decrypt_sum,
        encrypt_amount,
        load_context,
        serialize_context,
    )
    from db import delete_expense, get_expenses, init_db, save_expense
except ImportError as exc:
    st.error(f"Missing dependency: {exc}\n\nRun: `pip install -r requirements.txt`")
    st.stop()

# ── Paths ─────────────────────────────────────────────────────────────────────
_APP_DIR  = os.path.dirname(os.path.abspath(__file__))
_DATA_DIR = os.path.join(_APP_DIR, "data")
_KEY_PATH = os.path.join(_DATA_DIR, "secret.key")
_DB_PATH  = os.path.join(_DATA_DIR, "expenses.db")
os.makedirs(_DATA_DIR, exist_ok=True)

# ── Session state defaults ────────────────────────────────────────────────────
if "ctx" not in st.session_state:
    st.session_state.ctx = None
if "key_just_created" not in st.session_state:
    st.session_state.key_just_created = False
if "conn" not in st.session_state:
    st.session_state.conn = None
if "total_result" not in st.session_state:
    st.session_state.total_result = None  # (value, count, filtered_range)

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown('<p class="cs-title">CipherSpend</p>', unsafe_allow_html=True)
st.markdown(
    '<p class="cs-subtitle">'
    "Zero-knowledge expense tracking — amounts never leave your device unencrypted."
    "</p>",
    unsafe_allow_html=True,
)

# ── Key management ────────────────────────────────────────────────────────────
def _load_or_create_key() -> None:
    if os.path.exists(_KEY_PATH):
        with open(_KEY_PATH, "rb") as f:
            ctx_bytes = f.read()
        st.session_state.ctx = load_context(ctx_bytes)
    else:
        ctx = create_context()
        ctx_bytes = serialize_context(ctx, include_sk=True)
        with open(_KEY_PATH, "wb") as f:
            f.write(ctx_bytes)
        st.session_state.ctx = ctx
        st.session_state.key_just_created = True


if st.session_state.ctx is None:
    with st.spinner("Initializing encryption context…"):
        _load_or_create_key()

ctx = st.session_state.ctx

if st.session_state.key_just_created:
    st.markdown(
        '<div class="cs-warn">'
        "⚠ New encryption key generated and saved to <code>data/secret.key</code>. "
        "Back it up now — losing it makes all encrypted data irrecoverable."
        "</div>",
        unsafe_allow_html=True,
    )
    with open(_KEY_PATH, "rb") as f:
        _key_bytes = f.read()
    st.download_button(
        "⬇ Download Key Backup",
        data=_key_bytes,
        file_name="cipherspend_secret.key",
        mime="application/octet-stream",
        key="dl_key_new",
    )
    if st.button("I've saved my key backup — continue"):
        st.session_state.key_just_created = False
        st.rerun()
else:
    with open(_KEY_PATH, "rb") as f:
        _fp = hashlib.sha256(f.read()).hexdigest()[:16]
    st.markdown(
        f'<div class="cs-key-info">🔑 Encryption key loaded &nbsp;·&nbsp; '
        f"fingerprint: <b>{_fp}</b></div>",
        unsafe_allow_html=True,
    )

# ── Database init ─────────────────────────────────────────────────────────────
if st.session_state.conn is None:
    st.session_state.conn = init_db(_DB_PATH)
conn = st.session_state.conn

# ── Add expense form ──────────────────────────────────────────────────────────
st.markdown('<hr class="cs-divider">', unsafe_allow_html=True)

with st.form("add_expense", clear_on_submit=True):
    col1, col2, col3 = st.columns([3, 2, 1])
    with col1:
        desc = st.text_input(
            "Description",
            placeholder="Coffee, rent, groceries…",
            label_visibility="collapsed",
        )
    with col2:
        amount = st.number_input(
            "Amount",
            min_value=0.0,
            step=0.01,
            format="%.2f",
            value=None,
            placeholder="0.00",
            label_visibility="collapsed",
        )
    with col3:
        submitted = st.form_submit_button("Add", use_container_width=True)

if submitted:
    if not desc.strip():
        st.warning("Enter a description.")
    elif amount is None or amount <= 0:
        st.warning("Enter an amount greater than zero.")
    else:
        with st.spinner("Encrypting…"):
            ct_bytes = encrypt_amount(ctx, amount)
        save_expense(
            conn,
            expense_id=str(uuid.uuid4()),
            description=desc.strip(),
            timestamp=datetime.now().isoformat(),
            ciphertext=ct_bytes,
        )
        st.session_state.total_result = None  # invalidate cached total
        st.rerun()

# ── Expense list ──────────────────────────────────────────────────────────────
expenses = get_expenses(conn)

if not expenses:
    st.markdown(
        '<p class="cs-empty">No expenses yet. Add one above.</p>',
        unsafe_allow_html=True,
    )
else:
    rows_html = ""
    for i, exp in enumerate(expenses, 1):
        dt       = datetime.fromisoformat(exp["timestamp"])
        date_str = dt.strftime("%b %d, %Y")
        ct_disp  = ciphertext_to_display(exp["ciphertext"])
        desc_safe = escape(exp["description"])
        rows_html += (
            f"<tr>"
            f'<td style="color:#3a3a3a;">{i}</td>'
            f"<td>{desc_safe}</td>"
            f'<td style="color:#555;">{date_str}</td>'
            f'<td><span class="cipher-val" '
            f'title="This is an encrypted amount — only you can decrypt it.">'
            f"{ct_disp}</span></td>"
            f"</tr>"
        )

    st.markdown(
        f"""
<table class="cs-table">
  <thead>
    <tr>
      <th style="width:40px;">#</th>
      <th>Description</th>
      <th style="width:110px;">Date</th>
      <th>Encrypted Amount</th>
    </tr>
  </thead>
  <tbody>{rows_html}</tbody>
</table>""",
        unsafe_allow_html=True,
    )

# ── Calculate total ───────────────────────────────────────────────────────────
if expenses:
    st.markdown('<hr class="cs-divider">', unsafe_allow_html=True)

    col_a, col_b = st.columns([2, 1])
    with col_a:
        date_range = st.date_input(
            "Filter by date range (optional — leave empty for all)",
            value=(),
            label_visibility="visible",
        )
    with col_b:
        st.write("")  # vertical align
        calc = st.button("Calculate Total", use_container_width=True)

    if calc:
        filtered = expenses
        range_label = "all expenses"

        if isinstance(date_range, (list, tuple)) and len(date_range) == 2:
            start_dt: date = date_range[0]
            end_dt:   date = date_range[1]
            filtered = [
                e for e in expenses
                if start_dt
                <= datetime.fromisoformat(e["timestamp"]).date()
                <= end_dt
            ]
            range_label = f"{start_dt.strftime('%b %d')} – {end_dt.strftime('%b %d, %Y')}"

        if not filtered:
            st.warning("No expenses found in the selected date range.")
            st.session_state.total_result = None
        else:
            with st.spinner(
                f"Computing homomorphic sum of {len(filtered)} "
                f"ciphertext{'s' if len(filtered) > 1 else ''}…"
            ):
                total_val = decrypt_sum(ctx, [e["ciphertext"] for e in filtered])
            st.session_state.total_result = (total_val, len(filtered), range_label)

    if st.session_state.total_result is not None:
        total_val, count, range_label = st.session_state.total_result
        st.markdown(
            f'<p class="cs-total-label">Decrypted total</p>'
            f'<p class="cs-total">${total_val:,.2f}</p>'
            f'<p class="cs-total-meta">{count} expense{"s" if count > 1 else ""}'
            f" · {range_label}</p>",
            unsafe_allow_html=True,
        )
        # Precision check: CKKS is approximate — flag if noise causes >0.5¢ drift
        if abs(total_val - round(total_val, 2)) > 0.005:
            st.markdown(
                '<div class="cs-warn" style="margin-top:0.75rem;">'
                "⚠ Precision notice: noise accumulation detected in this result "
                "(error &gt; $0.005). Consider re-encrypting older expenses."
                "</div>",
                unsafe_allow_html=True,
            )

# ── Key & data management ─────────────────────────────────────────────────────
with st.expander("Key & Data Management"):
    st.caption(
        "Keep a backup of your secret key. Without it, all encrypted data is irrecoverable."
    )
    col1, col2 = st.columns(2)

    with col1:
        with open(_KEY_PATH, "rb") as f:
            st.download_button(
                "⬇ Download Secret Key",
                data=f.read(),
                file_name="cipherspend_secret.key",
                mime="application/octet-stream",
                key="dl_key_expander",
            )

    with col2:
        if os.path.exists(_DB_PATH):
            with open(_DB_PATH, "rb") as f:
                st.download_button(
                    "⬇ Export Encrypted Ledger",
                    data=f.read(),
                    file_name="cipherspend_expenses.db",
                    mime="application/octet-stream",
                    key="dl_db",
                )

    st.markdown('<hr class="cs-divider">', unsafe_allow_html=True)
    st.caption("Restore a previously backed-up key (replaces current key).")
    uploaded_key = st.file_uploader(
        "Upload secret key file",
        type=["key"],
        label_visibility="collapsed",
        key="upload_key",
    )
    if uploaded_key is not None:
        key_data = uploaded_key.read()
        try:
            _test_ctx = load_context(key_data)
            with open(_KEY_PATH, "wb") as f:
                f.write(key_data)
            st.session_state.ctx = _test_ctx
            st.session_state.conn = None  # force DB reconnect
            st.success("Key restored successfully.")
            st.rerun()
        except Exception as exc:
            st.error(f"Invalid key file: {exc}")
