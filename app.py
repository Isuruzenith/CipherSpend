"""
CipherSpend — zero-knowledge expense tracker.

Amounts are encrypted via CKKS homomorphic encryption before any storage.
Only the final homomorphically-summed ciphertext is decrypted for display.

Run with:  streamlit run app.py
"""
import hashlib
import os
import shutil
import uuid
from datetime import datetime, date, timezone, timedelta
from pathlib import Path

import streamlit as st
import tenseal as ts

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

  /* Responsive columns */
  @media (max-width: 650px) {
    div[data-testid="stHorizontalBlock"] {
      flex-wrap: wrap !important;
    }
    div[data-testid="stHorizontalBlock"] > div[data-testid="column"] {
      min-width: 100% !important;
      margin-bottom: 0.5rem;
    }
  }

  /* Encrypted value badge */
  .cipher-val {
    display: inline-block;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    background: #141a14;
    color: #5a9a70;
    padding: 6px 10px;
    border-radius: 4px;
    border: 1px solid #1e2e1e;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: default;
    letter-spacing: 0.03em;
    box-sizing: border-box;
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
        decrypt_key_material,
        decrypt_sum_with_health,
        encrypt_key_material,
        encrypt_amount,
        is_valid_key_envelope,
        load_context,
        serialize_context,
    )
    from db import (
        delete_expense,
        export_ledger_sql_dump,
        get_distinct_categories,
        get_expenses,
        get_expenses_filtered,
        init_db,
        is_valid_ledger_bytes,
        restore_ledger_file_from_bytes,
        save_expense,
        soft_delete_expense,
        restore_expense,
        get_deleted_expenses,
        update_expense,
        add_category,
        remove_category,
    )
except ImportError as exc:
    st.error(f"Missing dependency: {exc}\n\nRun: `pip install -r requirements.txt`")
    st.stop()

# ── Paths ─────────────────────────────────────────────────────────────────────
_APP_DIR  = os.path.dirname(os.path.abspath(__file__))
_DATA_DIR = os.path.join(_APP_DIR, "data")
_KEY_PATH = os.path.join(_DATA_DIR, "secret.key.enc")
_LEGACY_KEY_PATH = os.path.join(_DATA_DIR, "secret.key")
_DB_PATH  = os.path.join(_DATA_DIR, "expenses.db")
os.makedirs(_DATA_DIR, exist_ok=True)
_LOCAL_TZ = timezone(timedelta(hours=5, minutes=30))

# ── Session state defaults ────────────────────────────────────────────────────
if "ctx" not in st.session_state:
    st.session_state.ctx = None
if "key_just_created" not in st.session_state:
    st.session_state.key_just_created = False
if "conn" not in st.session_state:
    st.session_state.conn = None
if "total_result" not in st.session_state:
    st.session_state.total_result = None  # (value, count, filtered_range)
if "first_backup_ack" not in st.session_state:
    st.session_state.first_backup_ack = False
if "restore_key_bytes" not in st.session_state:
    st.session_state.restore_key_bytes = None
if "restore_ledger_bytes" not in st.session_state:
    st.session_state.restore_ledger_bytes = None
if "passphrase" not in st.session_state:
    st.session_state.passphrase = None
if "needs_passphrase_setup" not in st.session_state:
    st.session_state.needs_passphrase_setup = False
if "legacy_key_found" not in st.session_state:
    st.session_state.legacy_key_found = False
if "last_deleted_id" not in st.session_state:
    st.session_state.last_deleted_id = None

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown('<p class="cs-title">CipherSpend</p>', unsafe_allow_html=True)
st.markdown(
    '<p class="cs-subtitle">'
    "Zero-knowledge expense tracking — amounts never leave your device unencrypted."
    "</p>",
    unsafe_allow_html=True,
)

# ── Key management ────────────────────────────────────────────────────────────
def _refresh_local_state_from_disk() -> None:
    """
    Ensure app state reconnects to local files if they exist after a rerun/restart.
    """
    if st.session_state.conn is None:
        st.session_state.conn = init_db(_DB_PATH)


def _to_local_display_time(ts_iso: str) -> str:
    dt = datetime.fromisoformat(ts_iso)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=_LOCAL_TZ)
    else:
        dt = dt.astimezone(_LOCAL_TZ)
    return dt.strftime("%Y-%m-%d %H:%M:%S GMT+05:30")


def _compute_total_for_filters(
    conn,
    ctx,
    date_range_value,
    category_value: str,
) -> tuple[float | None, int, str, float, bool]:
    start_iso = None
    end_iso = None
    range_label = "all expenses"
    if isinstance(date_range_value, (list, tuple)) and len(date_range_value) == 2:
        start_dt: date = date_range_value[0]
        end_dt: date = date_range_value[1]
        start_iso = f"{start_dt.isoformat()}T00:00:00"
        end_iso = f"{end_dt.isoformat()}T23:59:59.999999"
        range_label = f"{start_dt.strftime('%b %d')} – {end_dt.strftime('%b %d, %Y')}"

    filtered = get_expenses_filtered(
        conn,
        start_iso=start_iso,
        end_iso=end_iso,
        category=category_value,
    )
    if category_value != "All":
        range_label = f"{range_label} · {category_value}"

    if not filtered:
        return None, 0, range_label, 0.0, False

    total_val, drift, refreshed = decrypt_sum_with_health(
        ctx, [e["ciphertext"] for e in filtered]
    )
    return total_val, len(filtered), range_label, drift, refreshed


def _apply_restore_payloads() -> None:
    if st.session_state.restore_key_bytes is None and st.session_state.restore_ledger_bytes is None:
        return

    if st.session_state.restore_key_bytes is not None:
        if st.session_state.passphrase is None:
            raise ValueError("Passphrase required to restore key.")
        key_bytes = decrypt_key_material(
            st.session_state.restore_key_bytes, st.session_state.passphrase
        )
        new_ctx = load_context(key_bytes)
        with open(_KEY_PATH, "wb") as f:
            f.write(st.session_state.restore_key_bytes)
        st.session_state.ctx = new_ctx

    if st.session_state.restore_ledger_bytes is not None:
        if st.session_state.conn is not None:
            st.session_state.conn.close()
        restore_ledger_file_from_bytes(st.session_state.restore_ledger_bytes, _DB_PATH)
        st.session_state.conn = None

    st.session_state.restore_key_bytes = None
    st.session_state.restore_ledger_bytes = None
    st.session_state.total_result = None


def _load_or_create_key() -> None:
    st.session_state.needs_passphrase_setup = not os.path.exists(_KEY_PATH)
    st.session_state.legacy_key_found = (
        st.session_state.needs_passphrase_setup and os.path.exists(_LEGACY_KEY_PATH)
    )


def _unlock_or_setup_key() -> None:
    if st.session_state.needs_passphrase_setup:
        st.markdown(
            '<div class="cs-warn">⚠ Set a passphrase to protect your local encryption key at rest.</div>',
            unsafe_allow_html=True,
        )
        if st.session_state.legacy_key_found:
            st.caption(
                "Legacy key detected (`data/secret.key`). It will be wrapped into encrypted storage."
            )
        p1 = st.text_input(
            "Create passphrase",
            type="password",
            placeholder="Create passphrase",
            label_visibility="collapsed",
            key="passphrase_input_create",
        )
        p2 = st.text_input(
            "Confirm passphrase",
            type="password",
            placeholder="Confirm passphrase",
            label_visibility="collapsed",
            key="passphrase_input_confirm",
        )
        if st.button("Create Encrypted Key", use_container_width=True, key="create_key_btn"):
            if not p1 or len(p1) < 10:
                st.warning("Use a passphrase with at least 10 characters.")
            elif p1 != p2:
                st.warning("Passphrases do not match.")
            else:
                if st.session_state.legacy_key_found:
                    with open(_LEGACY_KEY_PATH, "rb") as f:
                        raw_key = f.read()
                    ctx = load_context(raw_key)
                else:
                    ctx = create_context()
                    raw_key = serialize_context(ctx, include_sk=True)
                enc_key = encrypt_key_material(raw_key, p1)
                with open(_KEY_PATH, "wb") as f:
                    f.write(enc_key)
                if os.path.exists(_LEGACY_KEY_PATH):
                    os.remove(_LEGACY_KEY_PATH)
                st.session_state.passphrase = p1
                st.session_state.ctx = ctx
                st.session_state.key_just_created = True
                st.session_state.needs_passphrase_setup = False
                st.session_state.legacy_key_found = False
                st.rerun()
        st.stop()

    if st.session_state.passphrase is None:
        st.markdown(
            '<div class="cs-warn">🔒 Enter your passphrase to unlock your local key.</div>',
            unsafe_allow_html=True,
        )
        passphrase = st.text_input(
            "Passphrase",
            type="password",
            placeholder="Enter passphrase",
            label_visibility="collapsed",
            key="passphrase_input_unlock",
        )
        if st.button("Unlock", use_container_width=True, key="unlock_btn"):
            if not passphrase:
                st.warning("Passphrase is required.")
            else:
                st.session_state.passphrase = passphrase
                st.rerun()
        st.stop()

    if st.session_state.ctx is None:
        with open(_KEY_PATH, "rb") as f:
            envelope = f.read()
        if not is_valid_key_envelope(envelope):
            st.error("Encrypted key file format is invalid.")
            st.stop()
        try:
            key_bytes = decrypt_key_material(envelope, st.session_state.passphrase)
            st.session_state.ctx = load_context(key_bytes)
        except Exception:
            st.error("Failed to unlock key. Check your passphrase.")
            st.session_state.passphrase = None
            st.stop()


if st.session_state.ctx is None:
    with st.spinner("Initializing encryption context…"):
        _load_or_create_key()

_unlock_or_setup_key()
_refresh_local_state_from_disk()

ctx = st.session_state.ctx

if st.session_state.key_just_created:
    st.markdown(
        '<div class="cs-warn">'
        "⚠ New encryption key generated and saved to <code>data/secret.key.enc</code>. "
        "Download your backup now — losing it makes all encrypted data irrecoverable."
        "</div>",
        unsafe_allow_html=True,
    )
    with open(_KEY_PATH, "rb") as f:
        _key_bytes = f.read()
    st.download_button(
        "⬇ Download Key Backup",
        data=_key_bytes,
        file_name="cipherspend_secret.key.enc",
        mime="application/octet-stream",
        key="dl_key_new",
    )
    st.caption("Required before continuing: save this file somewhere safe.")
    st.session_state.first_backup_ack = st.checkbox(
        "I downloaded and safely stored my key backup.",
        value=st.session_state.first_backup_ack,
        key="first_backup_checkbox",
    )
    if st.button("Continue to app", disabled=not st.session_state.first_backup_ack):
        st.session_state.key_just_created = False
        st.session_state.first_backup_ack = False
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

# ── Dialogs ───────────────────────────────────────────────────────────────────
@st.dialog("Edit Expense")
def edit_expense_dialog(exp_id: str, current_desc: str, current_cat: str):
    new_desc = st.text_input("Description", value=current_desc)
    cat_opts = get_distinct_categories(st.session_state.conn)
    idx = cat_opts.index(current_cat) if current_cat in cat_opts else 0
    new_cat = st.selectbox("Category", cat_opts, index=idx)
    if st.button("Save Changes"):
        update_expense(st.session_state.conn, exp_id, new_desc, new_cat)
        st.session_state.total_result = None
        st.rerun()

@st.dialog("Manage Categories")
def manage_categories_dialog():
    st.write("Add or remove custom categories.")
    cat_opts = get_distinct_categories(st.session_state.conn)
    col1, col2 = st.columns([3,1])
    with col1:
        new_c = st.text_input("New category", label_visibility="collapsed", placeholder="New category name")
    with col2:
        if st.button("Add"):
            if new_c.strip():
                add_category(st.session_state.conn, new_c.strip())
                st.rerun()
    st.divider()
    for c in cat_opts:
        c1, c2 = st.columns([3,1])
        c1.write(c)
        if c1.button("Remove", key=f"rm_cat_{c}", help=f"Remove {c}"):
            remove_category(st.session_state.conn, c)
            st.rerun()


@st.dialog("Rotate Secret Key")
def rotate_key_dialog():
    st.markdown("### Key Rotation")
    st.write("This will decrypt and re-encrypt your entire database with a new secret key.")
    st.warning("If this process is interrupted, your database will be restored to its previous state automatically.", icon="⚠️")
    
    current_pass = st.text_input("Current Passphrase", type="password")
    new_pass = st.text_input("New Passphrase (or re-use current)", type="password")
    new_pass2 = st.text_input("Confirm New Passphrase", type="password")
    
    if st.button("Start Rotation", use_container_width=True):
        if not current_pass or not new_pass or new_pass != new_pass2:
            st.error("Invalid passphrases or passphrases do not match.")
            return

        # 1. Verify current passphrase
        try:
            with open(_KEY_PATH, "rb") as f:
                env = f.read()
            decrypt_key_material(env, current_pass)
        except Exception:
            st.error("Incorrect current passphrase.")
            return
            
        progress_bar = st.progress(0, text="Preparing backups...")
            
        # 2. Pre-flight backup
        bak_db = _DB_PATH + ".bak"
        bak_key = _KEY_PATH + ".bak"
        try:
            shutil.copy2(_DB_PATH, bak_db)
            shutil.copy2(_KEY_PATH, bak_key)
        except Exception as e:
            st.error(f"Failed to create pre-flight backups: {e}")
            return
            
        # 3. Context Generation & Re-encryption
        try:
            progress_bar.progress(5, text="Generating new CKKS context (this takes a moment)...")
            new_ctx = create_context()
            raw_key = serialize_context(new_ctx, include_sk=True)
            new_env = encrypt_key_material(raw_key, new_pass)
            
            expenses_active = get_expenses(st.session_state.conn)
            expenses_deleted = get_deleted_expenses(st.session_state.conn)
            all_expenses = expenses_active + expenses_deleted
            total = len(all_expenses)
            
            st.session_state.conn.execute("BEGIN TRANSACTION")
            
            for i, exp in enumerate(all_expenses):
                progress_msg = f"Re-encrypting {i+1} of {total} expenses..."
                progress_bar.progress(10 + int((i / max(total, 1)) * 80), text=progress_msg)
                
                # decrypt with old ctx
                pt_amount = ts.ckks_vector_from(st.session_state.ctx, exp["ciphertext"]).decrypt()[0]
                # encrypt with new ctx
                new_ct = encrypt_amount(new_ctx, pt_amount)
                # update db
                st.session_state.conn.execute("UPDATE expenses SET ciphertext = ? WHERE id = ?", (new_ct, exp["id"]))
                    
            progress_bar.progress(95, text="Committing changes...")
            st.session_state.conn.commit()
            
            # 4. Key Commit
            with open(_KEY_PATH, "wb") as f:
                f.write(new_env)
                
            # 5. Session state update
            st.session_state.ctx = new_ctx
            st.session_state.passphrase = new_pass
            st.session_state.total_result = None
            
            # Trigger mandatory backup download next rerun
            st.session_state.key_just_created = True 
            
            # 6. Cleanup
            progress_bar.progress(100, text="Cleaning up...")
            if os.path.exists(bak_db): os.remove(bak_db)
            if os.path.exists(bak_key): os.remove(bak_key)
            
            st.rerun()
            
        except Exception as e:
            st.error(f"Error during rotation: {e}")
            st.session_state.conn.rollback()
            # Restore from backup
            if os.path.exists(bak_db):
                shutil.move(bak_db, _DB_PATH)
            if os.path.exists(bak_key):
                shutil.move(bak_key, _KEY_PATH)
            st.stop()

# ── Add expense form ──────────────────────────────────────────────────────────
st.markdown('<hr class="cs-divider">', unsafe_allow_html=True)

form_c1, form_c2 = st.columns([3, 1])
with form_c2:
    if st.button("⚙ Manage Categories", use_container_width=True):
        manage_categories_dialog()

with st.form("add_expense", clear_on_submit=True):
    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
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
        cat_opts = get_distinct_categories(conn)
        category = st.selectbox(
            "Category",
            cat_opts,
            index=0,
            label_visibility="collapsed",
        )
    with col4:
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
            category=category,
        )
        st.session_state.last_deleted_id = None
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
    st.markdown('<p class="cs-total-label" style="margin:0; padding-bottom: 0.5rem;">Ledger List</p>', unsafe_allow_html=True)
    st.markdown('<hr class="cs-divider" style="margin-top: 0;">', unsafe_allow_html=True)
    
    for exp in expenses:
        with st.container():
            c1, c2, c3 = st.columns([3, 4, 1.5], gap="medium")
            with c1:
                st.markdown(
                    f"<div style='margin-top: 5px; margin-bottom: 8px;'>"
                    f"<span style='color:#eee; font-size:15px; font-weight:600;'>{exp['description']}</span><br/>"
                    f"<span style='color:#888; font-size:12px;'>{_to_local_display_time(exp['timestamp'])}</span>"
                    f"</div>",
                    unsafe_allow_html=True
                )
                st.markdown(f"<span style='background:#101b15; color:#44aa88; padding:2px 8px; border-radius:4px; font-size:11px; text-transform:uppercase; letter-spacing:0.04em;'>{exp.get('category', 'Default')}</span>", unsafe_allow_html=True)
            with c2:
                st.markdown(
                    f'<div style="display:flex; align-items:center; height:100%; min-height:55px;">'
                    f'<div class="cipher-val" title="Encrypted amount">'
                    f"{ciphertext_to_display(exp['ciphertext'])}</div></div>",
                    unsafe_allow_html=True,
                )
            with c3:
                st.markdown('<div style="height: 12px;"></div>', unsafe_allow_html=True)
                b1, b2 = st.columns(2)
                with b1:
                    if st.button("✎", key=f"edit_{exp['id']}", help="Edit expense"):
                        edit_expense_dialog(exp['id'], exp['description'], exp.get('category', 'Default'))
                with b2:
                    if st.button("🗑", key=f"del_{exp['id']}", help="Soft delete expense"):
                        soft_delete_expense(conn, exp["id"])
                        st.session_state.last_deleted_id = exp["id"]
                        st.session_state.total_result = None
                        if "date_filter_total" in st.session_state and "category_filter_total" in st.session_state:
                            total_val, count, range_label, drift, refreshed = _compute_total_for_filters(
                                conn,
                                ctx,
                                st.session_state.date_filter_total,
                                st.session_state.category_filter_total,
                            )
                            if total_val is not None:
                                st.session_state.total_result = (total_val, count, range_label, drift, refreshed)
                        st.rerun()
        st.markdown('<hr class="cs-divider" style="margin: 0.75rem 0;">', unsafe_allow_html=True)

# ── Calculate total ───────────────────────────────────────────────────────────
if expenses:
    st.markdown('<hr class="cs-divider">', unsafe_allow_html=True)

    col_a, col_b, col_c = st.columns([2, 2, 1])
    with col_a:
        date_range = st.date_input(
            "Filter by date range (optional — leave empty for all)",
            value=(),
            label_visibility="visible",
            key="date_filter_total",
        )
    with col_b:
        category_options = ["All"] + get_distinct_categories(conn)
        category_filter = st.selectbox(
            "Filter by category",
            category_options,
            index=0,
            key="category_filter_total",
        )
    with col_c:
        st.write("")
        calc = st.button("Calculate Total", use_container_width=True)

    if calc:
        total_val, count, range_label, drift, refreshed = _compute_total_for_filters(
            conn,
            ctx,
            date_range,
            category_filter,
        )
        if total_val is None:
            st.warning("No expenses found for current filters.")
            st.session_state.total_result = None
        else:
            st.session_state.total_result = (total_val, count, range_label, drift, refreshed)

    if st.session_state.total_result is not None:
        total_val, count, range_label, drift, refreshed = st.session_state.total_result
        st.markdown(
            f'<p class="cs-total-label">Decrypted total</p>'
            f'<p class="cs-total">${total_val:,.2f}</p>'
            f'<p class="cs-total-meta">{count} expense{"s" if count > 1 else ""}'
            f" · {range_label}</p>",
            unsafe_allow_html=True,
        )
        if refreshed:
            st.markdown(
                '<div class="cs-warn" style="margin-top:0.75rem;">'
                "⚠ Precision health: aggregate ciphertext was auto-refreshed locally "
                "to maintain stability."
                "</div>",
                unsafe_allow_html=True,
            )
        elif drift > 0.005:
            st.markdown(
                '<div class="cs-warn" style="margin-top:0.75rem;">'
                "⚠ Precision notice: noise accumulation detected in this result "
                "(error &gt; $0.005). Consider re-encrypting older expenses."
                "</div>",
                unsafe_allow_html=True,
            )

# ── Trash & Soft Delete ────────────────────────────────────────────────────────
if st.session_state.last_deleted_id:
    st.info("Expense moved to Trash.")
    if st.button("Undo Delete", key="undo_soft_delete"):
        restore_expense(conn, st.session_state.last_deleted_id)
        st.session_state.last_deleted_id = None
        st.session_state.total_result = None
        st.rerun()
    if st.button("Dismiss", key="dismiss_undo"):
        st.session_state.last_deleted_id = None
        st.rerun()

deleted_expenses = get_deleted_expenses(conn)
if deleted_expenses:
    with st.expander(f"🗑️ Trash ({len(deleted_expenses)})"):
        for de_exp in deleted_expenses:
            st.write(f"**{de_exp['description']}** — {de_exp.get('category', 'Default')} ({_to_local_display_time(de_exp['timestamp'])})")
            c1, c2 = st.columns(2)
            with c1:
                if st.button("Restore", key=f"restore_{de_exp['id']}"):
                    restore_expense(conn, de_exp["id"])
                    st.session_state.last_deleted_id = None
                    st.session_state.total_result = None
                    st.rerun()
            with c2:
                if st.button("Permanent Delete", key=f"hard_del_{de_exp['id']}"):
                    delete_expense(conn, de_exp["id"])
                    st.session_state.last_deleted_id = None
                    st.session_state.total_result = None
                    st.rerun()
            st.markdown('<hr class="cs-divider" style="margin: 0.25rem 0;">', unsafe_allow_html=True)

# ── Key & data management ─────────────────────────────────────────────────────
with st.expander("Key & Data Management"):
    st.caption(
        "Keep a backup of your secret key. Without it, all encrypted data is irrecoverable."
    )
    col1, col2, col3 = st.columns(3)

    with col1:
        with open(_KEY_PATH, "rb") as f:
            st.download_button(
                "⬇ Download Secret Key",
                data=f.read(),
                file_name="cipherspend_secret.key.enc",
                mime="application/octet-stream",
                key="dl_key_expander",
            )

    with col2:
        with open(_DB_PATH, "rb") as f:
            db_data = f.read()

        import zipfile
        import io
        import hmac

        try:
            pp = st.session_state.passphrase or ""
            mac = hmac.new(pp.encode("utf-8"), db_data, hashlib.sha256).hexdigest()
            zip_buf = io.BytesIO()
            with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
                zf.writestr("expenses.db", db_data)
                zf.writestr("ledger_mac.txt", mac)
            export_data = zip_buf.getvalue()
            export_name = "cipherspend_ledger.zip"
            mime_type = "application/zip"
            btn_label = "⬇ Export Ledger Bundle (.zip)"
        except Exception:
            export_data = db_data
            export_name = "cipherspend_expenses.db"
            mime_type = "application/octet-stream"
            btn_label = "⬇ Export Ledger (SQLite)"

        st.download_button(
            btn_label,
            data=export_data,
            file_name=export_name,
            mime=mime_type,
            key="dl_db_sqlite",
        )

    with col3:
        st.download_button(
            "⬇ Export Ledger (SQL)",
            data=export_ledger_sql_dump(conn),
            file_name="cipherspend_expenses.sql",
            mime="text/plain",
            key="dl_db_sql_dump",
        )
        
    st.markdown('<div style="height: 12px;"></div>', unsafe_allow_html=True)
    if st.button("🔄 Rotate Secret Key", use_container_width=True):
        rotate_key_dialog()

    st.markdown('<hr class="cs-divider">', unsafe_allow_html=True)
    st.caption(
        "Restore from backup on this device (uploads are used only locally in this app). "
        "You can apply key only, ledger only, or both."
    )

    restore_key = st.file_uploader(
        "Upload encrypted secret key file",
        type=["enc", "key"],
        label_visibility="collapsed",
        key="upload_key",
    )
    if restore_key is not None:
        key_data = restore_key.read()
        try:
            if st.session_state.passphrase is None:
                st.error("Unlock with passphrase before restoring key.")
            elif not is_valid_key_envelope(key_data):
                st.error("Invalid encrypted key file.")
            else:
                decrypt_key_material(key_data, st.session_state.passphrase)
                st.session_state.restore_key_bytes = key_data
                st.success("Encrypted key validated and staged.")
        except Exception:
            st.error("Invalid key file or incorrect passphrase.")

    restore_ledger = st.file_uploader(
        "Upload encrypted ledger bundle (.zip or .db)",
        type=["zip", "db", "sqlite", "sqlite3"],
        label_visibility="collapsed",
        key="upload_ledger",
    )
    if restore_ledger is not None:
        ledger_data = restore_ledger.read()
        
        if restore_ledger.name.endswith(".zip"):
            import zipfile
            import io
            import hmac
            try:
                with zipfile.ZipFile(io.BytesIO(ledger_data)) as zf:
                    db_bytes = zf.read("expenses.db")
                    mac_expected = zf.read("ledger_mac.txt").decode("utf-8")
                    pp = st.session_state.passphrase or ""
                    mac_actual = hmac.new(pp.encode("utf-8"), db_bytes, hashlib.sha256).hexdigest()
                    if not hmac.compare_digest(mac_expected, mac_actual):
                        st.error("Ledger HMAC verification failed! File may be corrupted or tampered with.")
                        st.stop()
                    ledger_data = db_bytes
            except Exception as e:
                st.error(f"Failed to read ZIP bundle: {e}")
                st.stop()

        if is_valid_ledger_bytes(ledger_data):
            st.session_state.restore_ledger_bytes = ledger_data
            st.success("Encrypted ledger validated and staged.")
        else:
            st.error("Invalid ledger file.")

    staged_count = int(st.session_state.restore_key_bytes is not None) + int(
        st.session_state.restore_ledger_bytes is not None
    )
    if staged_count > 0:
        restore_summary = []
        if st.session_state.restore_key_bytes is not None:
            restore_summary.append("secret key")
        if st.session_state.restore_ledger_bytes is not None:
            restore_summary.append("encrypted ledger")
        st.caption(f"Ready to apply: {', '.join(restore_summary)}.")
        if st.button("Apply Restore", use_container_width=True, key="apply_restore"):
            try:
                _apply_restore_payloads()
                st.success("Restore applied successfully.")
                st.rerun()
            except Exception:
                st.error("Restore failed. Please verify backup files and try again.")
        if st.button("Clear staged restore files", key="clear_restore_stage"):
            st.session_state.restore_key_bytes = None
            st.session_state.restore_ledger_bytes = None
            st.rerun()

    st.markdown('<hr class="cs-divider">', unsafe_allow_html=True)
    data_files = []
    if Path(_KEY_PATH).exists():
        data_files.append("secret.key")
    if Path(_DB_PATH).exists():
        data_files.append("expenses.db")
    st.caption(f"Auto-recovery files detected in data/: {', '.join(data_files) if data_files else 'none'}")
