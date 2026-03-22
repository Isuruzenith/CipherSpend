# CipherSpend

> Zero-knowledge expense tracking — amounts never leave your device unencrypted.

CipherSpend uses **CKKS homomorphic encryption** (via [TenSEAL](https://github.com/OpenMined/TenSEAL)) to let you track expenses where raw monetary values are never stored in plaintext. Additions are computed directly on ciphertexts; only the final aggregate is decrypted.

---

## How it works

1. A CKKS keypair is generated on first launch, then wrapped with a passphrase-derived key and saved to `data/secret.key.enc`.
2. Every amount you enter is encrypted client-side before touching the database.
3. SQLite stores only ciphertext BLOBs + plaintext metadata (description, timestamp, category) — never amounts.
4. "Calculate Total" performs homomorphic addition across stored ciphertexts, then decrypts only the final sum.

**The secret key never leaves your machine.**

---

## Stack

| Layer | Technology |
|---|---|
| UI | Streamlit ≥ 1.28 |
| Encryption | TenSEAL 0.3.16 (CKKS, Microsoft SEAL) |
| Key wrapping | PBKDF2-HMAC-SHA256 + AES-256-GCM (`cryptography`) |
| Storage | SQLite |
| Language | Python 3.10+ |

---

## Getting started

### Local

```bash
pip install -r requirements.txt
streamlit run app.py
```

Open `http://localhost:8501`.

### Docker

```bash
docker build -t cipherspend .

# Mount data/ so your key and DB survive container restarts
docker run -p 8501:8501 -v "$PWD/data:/app/data" cipherspend
```

---

## Project structure

```
app.py              # Streamlit SPA — UI, key lifecycle, expense form
crypto.py           # CKKS encrypt / homomorphic sum / decrypt
db.py               # SQLite helpers (schema, save, query)
requirements.txt    # Python dependencies
Dockerfile          # Container build
.streamlit/
  config.toml       # Dark theme
data/               # Runtime only — gitignored
  secret.key.enc    # Encrypted key envelope (passphrase-protected)
  expenses.db       # SQLite database
```

---

## Key management

| Action | How |
|---|---|
| **Backup key** | Download prompt on first launch, or *Key & Data Management* expander (`.enc`) |
| **Export ledger** | *Key & Data Management* → Export Ledger (`.db`) or SQL dump (`.sql`) |
| **Restore state** | *Key & Data Management* → Upload key and/or ledger, then click **Apply Restore** |

> **Warning:** Losing `secret.key.enc` or forgetting your passphrase makes encrypted expenses permanently irrecoverable.

### Restore on a new device

1. Start CipherSpend once to create `data/`.
2. Open *Key & Data Management*.
3. Upload `cipherspend_secret.key.enc` and `cipherspend_expenses.db` (or just one, if needed).
4. Click **Apply Restore**.

CipherSpend validates files locally before replacing active data.

---

## Encryption parameters

| Parameter | Value |
|---|---|
| Scheme | CKKS |
| `poly_modulus_degree` | 8192 |
| `coeff_mod_bit_sizes` | `[60, 40, 40, 60]` |
| Scale | 2⁴⁰ |
| Security level | ~128-bit |

CKKS is an *approximate* scheme — precision is ~10–12 significant decimal digits, more than sufficient for currency. A precision warning is shown if noise drift exceeds $0.005 on the decrypted total.

If drift grows or the sum involves many ciphertexts, CipherSpend automatically refreshes the aggregate ciphertext locally to keep precision stable.

---

## License

MIT
