**Product Requirements Document (PRD)** for **CipherSpend Cloud**

- Strategic pivot to **multi-user cloud architecture** (already implied but emphasized).
- **shadcn/ui** as the **exclusive UI component library** (using only its official/default primitives, no custom or third-party UI libs beyond what's needed for charts).
- Professional, accessible, high-performance interface with **dark mode as primary/default** aesthetic.
- **Privacy-maximalist** design language: clean, minimal, trust-building signals (lock icons, encryption badges, subtle neon-mint accents on dark base).
- Deeper explanation of **Homomorphic Encryption workflows**.
- Updated page-by-page **UI/UX architecture** using **only shadcn/ui components**.

**Product Requirements Document (PRD): CipherSpend Cloud**  
**Version**: 2.0 – Multi-user, shadcn/ui Edition  
**Date**: March 2026

### 1. Product Vision & Overview
CipherSpend Cloud is a **zero-knowledge**, privacy-maximalist expense tracking SaaS built for multiple users. It enables individuals (and in future – shared household/family vaults) to track finances across any device without ever exposing **plaintext** financial amounts or **secret cryptographic keys** to the central server.

All sensitive operations (encryption, decryption, key management) occur strictly at the **edge** (user's browser via WASM). The server remains completely blind to numerical values while still enabling powerful aggregations through **Fully Homomorphic Encryption (FHE)**.

Core promise:  
“Your money stays private — even from us.”

### 2. Comprehensive Guide to Homomorphic Encryption (HE) in CipherSpend

#### The Mathematical Intuition
Traditional encryption:  
To compute on data → must decrypt first → vulnerable window.

HE property (additive in CKKS):  
E(m₁) ⊕ E(m₂) = E(m₁ + m₂)  
(where ⊕ is the homomorphic addition operator on ciphertexts)

The server can **blindly add** thousands of encrypted expenses and return one encrypted sum — only the user's browser (with the secret key) can decrypt the final result.

#### The CKKS Scheme – Why We Chose It
- **Approximate arithmetic** → handles floating-point numbers (¥10.50, 3.99, etc.) with tunable precision.
- ** SIMD-like** batching → efficient for many additions.
- **Rescaling** → controls noise growth during multiplications/additions.

#### Security Parameters (Current)
- Polynomial modulus degree: **8192**
- Coefficient modulus bits: multi-prime chain (~128–256 bit security)
- Plaintext scale: **2⁴⁰**
- Encoding: CKKS slots used for single-value encoding per ciphertext (future: batching multiple expenses)

#### Homomorphic Encryption Workflows – Detailed

**Workflow 1: Client-Side Encryption (Add Expense)**  
1. User enters amount → e.g. 105.50 (float)  
2. Browser (node-seal WASM):  
   - Encode float into plaintext polynomial  
   - Encrypt under **public key** → ciphertext c  
   - Return Base64(c)  
3. POST → /api/expenses { metadata, Base64(c) }

**Workflow 2: Blind Server-Side Aggregation (Monthly Total)**  
1. Client requests total for period → JWT-authenticated  
2. Server (tenSEAL):  
   - SELECT all ciphertexts WHERE user_id = ? AND date BETWEEN ? AND ?  
   - Initialize running_sum = encrypt(0)  (or first ciphertext)  
   - For each subsequent cᵢ: running_sum = running_sum ⊕ cᵢ  (homomorphic add)  
   - Return single aggregated ciphertext c_total (Base64)  
3. Client (node-seal):  
   - Decrypt(c_total, secret_key) → approximate float  
   - Round to 2 decimal places → display 1,245.75

**Workflow 3: Key Generation & Vaulting (Registration)**  
1. Browser: generate CKKS context + keypair (pk, sk, relin, galois if needed)  
2. Derive KEK = PBKDF2(passphrase + salt, 600,000 iterations, SHA-256, 256-bit)  
3. Encrypt sk → AES-GCM(wrapped_sk, KEK, nonce)  
4. Send to server: email, pw_hash, salt, pk (serialized), wrapped_sk

**Workflow 4: Unlock (Login)**  
1. Server returns: salt, pk, wrapped_sk  
2. Browser: KEK = PBKDF2(entered_passphrase + salt, …)  
3. sk = AES-GCM.decrypt(wrapped_sk, KEK)  
4. Hydrate CryptoContext → app unlocks

### 3. Technology Stack

- **Frontend**: React 18+ (Vite), TypeScript, Tailwind CSS v4  
- **UI Library**: shadcn/ui (only official components – Radix primitives + Tailwind styling)  
- **Charts**: shadcn/ui Charts (built on Recharts – area, bar, pie, line variants)  
- **Client-side Crypto**: node-seal (WASM – Microsoft SEAL)  
- **Backend**: Python 3.11+, FastAPI, Uvicorn  
- **Server-side FHE**: tenSEAL (with custom serialization bridge)  
- **Database**: SQLite (dev) → PostgreSQL (prod, with JSONB or BYTEA for ciphertexts)  
- **Auth**: JWT (access + refresh), PBKDF2 key derivation  

### 4. UI/UX Architecture (Page-by-Page – shadcn/ui Exclusive)

**Design Language**  
- **Default**: Dark mode (class="dark")  
- **Base color**: Zinc or Slate (neutral professional feel)  
- **Accent**: Neon-mint / teal (500–400) for success/encryption signals  
- **Trust elements**: Lock icons (lucide-react), "Encrypted" badges, subtle loading messages ("Decrypting aggregate…")

| Page              | Primary shadcn/ui Components                          | Purpose & Key UX Signals                                                                 |
|-------------------|-------------------------------------------------------|------------------------------------------------------------------------------------------|
| Landing (public)  | Card, Button, Badge, Separator, NavigationMenu        | Educate on zero-knowledge + FHE. Hero with "Your data stays encrypted" lock badge. CTA: Sign Up / Log In |
| Sign Up           | Form, Input, Label, Button, Progress (pw strength), Skeleton, Sonner (toast) | Passphrase strength meter. Long "Generating secure vault…" skeleton + spinner during WASM keygen (~3–10s) |
| Log In            | Card, Input, Label, Button, Skeleton, Alert           | "Unlocking your encrypted vault…" skeleton. Alert if passphrase wrong (no account lockout) |
| Dashboard (Home)  | Card (multiple), Badge, Table (simple), shadcn Charts (area/bar), Tabs | Large decrypted total card with "Decrypted on device" badge. Monthly trend chart. Quick-add button (Dialog trigger) |
| Add Expense       | Dialog (modal), Form, Input, Select, Calendar (date), Button, Sonner | Modal form. "Encrypting…" toast during WASM encrypt → success green toast |
| History / List    | Data Table, Tabs (All / This Month / Categories), Input (search), Badge, Pagination | Decrypt each row on render (client). Encrypted amount column → badge "Encrypted until viewed" |
| Analytics         | Card, Select (month/year), shadcn Charts (pie, bar, line), Badge | Aggregated charts from server ciphertexts. "Server-blind computation" footnote |
| Settings          | Separator, Switch (theme, future features), AlertDialog, Button, Input (change passphrase), Sonner | Change passphrase → re-encrypt wrapped_sk warning. "Backup Encrypted Key" → copy wrapped_sk Base64 |
| Session Unlock    | Card, Input, Button, Skeleton                         | Minimal "Enter passphrase to unlock" screen (new tab / expired session) |

### 5. Security Invariants (Non-Negotiable)

1. **Zero-Knowledge Storage**  
   Database never sees plaintext amounts. Amounts = BYTEA/BLOB ciphertexts. Metadata (description, category, date) = plaintext.

2. **Key Isolation**  
   Secret Key **never** leaves browser unencrypted. Stored only as AES-GCM wrapped blob (protected by PBKDF2-derived KEK).

3. **Local-only Decryption**  
   Server returns **only encrypted aggregates**. Meaningful numbers revealed exclusively in browser memory.

4. **No Server-side Plaintext Window**  
   Even during aggregation — tenSEAL operates purely on ciphertexts.

5. **No Recovery**  
   Lost passphrase = permanent data loss (by design — reinforces zero-knowledge).

