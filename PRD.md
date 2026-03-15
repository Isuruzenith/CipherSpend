### 1. Product Overview

**Product Name:** CipherSpend  
**Product Vision:** Empower individuals with uncompromising financial privacy by enabling expense tracking and summation where no server, cloud, or third party ever accesses plaintext monetary values — achieved through client-side fully homomorphic encryption (FHE) with decryption occurring exclusively in the user's browser/session.

**Core Promise (Zero-Knowledge Guarantee):**  
- Raw amounts never leave the client unencrypted.  
- Server (if any) or local storage only sees ciphertext blobs.  
- Computations (additions) occur homomorphically without decryption.  
- Only the final aggregated result is decrypted for display.

**Platform:** Pure Python web application (single-user, local-first)  
**Primary Interface:** Ultra-minimalist single-page application (SPA-like behavior)  
**Deployment Model (MVP):** Local run via `streamlit run app.py` (no remote server needed initially)

### 2. Target Audience & Personas

- **Privacy maximalists** — Avoid apps that log, analyze, or monetize spending patterns (e.g., Mint, YNAB users concerned about data breaches).
- **Security & cryptography enthusiasts** — Familiar with zero-knowledge, FHE, or post-quantum concepts; willing to accept some UX friction for strong guarantees.
- **Minimalist trackers** — Seek distraction-free, fast logging without gamification, categories, charts, or AI insights.

### 3. Problem Statement

Conventional expense trackers require users to upload sensitive data (amounts, often descriptions/categories) to servers. Even with client-side encryption or E2EE:

- Servers usually decrypt in memory to compute aggregates (totals, averages).
- This exposes data to breaches, insider access, subpoenas, or telemetry leaks.
- Local-only apps often lack secure, verifiable computation on persistent encrypted data.

CipherSpend eliminates this trust by keeping all monetary values encrypted end-to-end, with additions performed directly on ciphertexts.

### 4. Solution Overview

CipherSpend uses **CKKS homomorphic encryption** (via TenSEAL / Microsoft SEAL) to enable:

- Client-side encryption of each expense amount.
- Storage of only ciphertext + plaintext metadata (description, timestamp).
- Homomorphic summation of any subset of encrypted amounts.
- On-demand local decryption of only the final result.

No decryption key ever leaves the client device.

### 5. Technical Stack

- **Frontend / App Framework:** Streamlit (Python-based)
- **Language / Runtime:** Python 3.10+
- **HE Library:** TenSEAL (preferred wrapper around Microsoft SEAL for easier vector operations)
- **Scheme:** CKKS (approximate fixed/floating-point arithmetic suitable for money)
- **Storage (Phase 1):** In-memory (Streamlit session state)
- **Storage (Phase 2):** Local file-based (SQLite with only ciphertext BLOBs + metadata; or encrypted JSON)
- **Key Management:** Client-generated CKKS context + secret key (stored locally via browser `localStorage`, file download, or passphrase-derived — never sent anywhere)

### 6. Functional Requirements (Prioritized User Stories)

#### Phase 1 – MVP (Core Zero-Knowledge Tracking)

- F1. As a user, I can enter a description (text) and amount (decimal) to log an expense.
- F2. The amount is immediately encoded + encrypted client-side using the user's public context before any storage or processing.
- F3. The expense list shows plaintext descriptions + timestamps, but displays encrypted amounts as compact hex/base64 blobs (with monospace font) to visually reinforce security.
- F4. I can trigger "Calculate Total" (optionally filtered by date range) → performs homomorphic addition of selected ciphertexts.
- F5. The final summed ciphertext is decrypted only in the current session and displayed (with warning if noise/precision degradation detected).

#### Phase 2 – Persistence & Basic Usability

- F6. Secure key/context generation on first use; user prompted to download backup (secret key + public context) immediately.
- F7. Persistent local storage of encrypted expenses (SQLite preferred for queryability on metadata).
- F8. Export/import functionality: encrypted ledger (JSON/SQLite dump) + separate secret key export.
- F9. Reload from saved key/context + database on app restart.

#### Phase 3 – Nice-to-Haves (post-MVP)

- Date-based filtering before summation.
- Basic categorization (plaintext only).
- Noise monitoring & auto-re-encryption when precision degrades.
- Passphrase-derived key (Argon2/PBKDF2) instead of raw key file.

### 7. Non-Functional Requirements

**Security & Privacy**

- Secret key **never** stored server-side or with ciphertexts.
- In web deployment (future): secret key stays in browser `localStorage` / IndexedDB or uploaded per session (file/passphrase).
- Threat model: honest-but-curious host, local storage compromise, network eavesdropping.
- 128-bit security level minimum (adjustable via parameters).

**Performance**

- Target: Homomorphic sum of **≤50–100** expenses < 3–5 seconds on modern laptop (realistic with optimized CKKS parameters, e.g., poly modulus degree 8192–16384, small multiplicative depth since only additions needed).
- Addition is very fast in CKKS (~microseconds per op); bottleneck is large vector summation if not batched cleverly.
- Precision: aim for ~10–12 decimal digits (sufficient for currency); monitor relinearization/rescaling needs.

**Usability / Accessibility**

- Load time < 5s (including TenSEAL init).
- Works offline after initial load.
- Mobile-responsive (Streamlit limitations apply).

**Browser Compatibility**

- Modern Chromium-based browsers (Chrome, Edge); Firefox/Safari partial support (test WebAssembly performance).

### 8. UI/UX Guidelines

Strict minimalism — no bloat.

- **Color Palette:** Monochrome (#000, #111, #222, #eee, #fff) + one accent (#4a8) for CTAs (e.g., "Add Expense", "Calculate").
- **Typography:** Single sans-serif (Inter or system-ui); sizes 14–20px; generous line-height.
- **Layout:** Centered single-column, wide negative space, max-width ~800px.
- **Encrypted Values:** Monospace font, gray background, tooltip: "This is an encrypted amount — only you can decrypt it."
- **Streamlit Customizations:** Use `st.markdown(..., unsafe_allow_html=True)` + CSS injection to hide:
  - Main menu/hamburger
  - Footer
  - Default padding/margins
  - Report a bug link
- Accept Streamlit reruns on interaction (state preserved via session_state).

### 9. Assumptions & Constraints

- Users understand they must safely back up their secret key — loss = data irrecoverable.
- CKKS is approximate → very large totals or many additions may lose low-order precision (mitigate with scaling).
- Streamlit is not ideal for complex SPA behavior (full-page reloads on interaction); accept for MVP.
- TenSEAL is research-oriented → potential API changes; pin version.
- No multi-user / sync support (single device only).

### 10. Risks & Mitigations

- **Performance too slow** → Mitigate: batch expenses into fewer ciphertexts (e.g., 10–20 values per vector), use smaller poly degree initially.
- **Precision loss** → Monitor noise budget; warn user and offer re-encryption.
- **Key loss** → Force backup prompt + recovery instructions on first use.
- **Streamlit styling limitations** → Use custom CSS hacks; consider migration path to nicer frontend later (if project grows).

### 11. Success Metrics (MVP)

- User can log 20+ expenses and compute total in <5s with no precision issues.
- Encrypted blobs visibly different even for same amounts.
- Key backup completed before second session.
- Positive feedback from privacy/crypto communities.