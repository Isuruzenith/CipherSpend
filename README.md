# CipherSpend

**A privacy-first expense tracker that encrypts monetary values in the browser before any data reaches the server.**

🌐 [Live Demo](https://cipherspend.netlify.app/)

---

## How it works

CipherSpend divides the world into two zones separated by a strict trust boundary.

**The browser is the only trusted party.** It generates encryption keys, encrypts expense amounts before upload, and decrypts ciphertext locally for display. Plaintext amounts never leave the device.

**The backend is untrusted for plaintext.** It stores ciphertext blobs, runs homomorphic aggregation (summing ciphertexts without decrypting them), and returns encrypted results. It never requires raw amounts to perform analytics.
<img width="1360" height="1560" alt="svgviewer-png-output" src="https://github.com/user-attachments/assets/ade79e69-3b86-4265-b957-9a7f80013f8e" />


### Crypto flow

1. User registers or unlocks with a passphrase.
2. Browser derives an AES-GCM wrapping key from the passphrase via PBKDF2, then initializes a SEAL context and generates CKKS key material (public key + secret key).
3. The secret key is wrapped (encrypted) with the AES-GCM key and sent to the backend as an opaque blob — the backend stores only the wrapped form and never learns the passphrase.
4. When the user adds an expense, the amount is encrypted client-side and uploaded as a base64 ciphertext alongside plaintext metadata (date, category, description).
5. The backend stores ciphertext and can sum ciphertext values homomorphically using TenSEAL without decrypting them.
6. The browser downloads ciphertext rows or aggregate ciphertext, decrypts them locally, and renders totals, charts, and the ledger.

### CKKS parameters

| Parameter | Value |
|---|---|
| Scheme | CKKS |
| Poly modulus degree | 8192 |
| Coeff mod bit sizes | `[60, 40, 40, 60]` |
| Scale | 2^40 |

CKKS uses approximate arithmetic, which is ideal for numeric analytics like totals and per-category spending.

### Key handling

- The secret key is wrapped client-side with a passphrase-derived key (PBKDF2 + AES-GCM).
- The backend stores only the wrapped blob — it cannot recover the passphrase or the secret key.
- Decryption happens entirely in the browser during an active vault session.

### Security assumptions and limitations

- If the browser is compromised at runtime, displayed plaintext is exposed. HE protects data at rest and in transit to the server, not against malware on the user's device.
- Timestamp, description, and category are not HE-encrypted and may still reveal metadata patterns.
- The app does not perform FX conversion; totals are interpreted per the selected currency.
- The frontend includes local aggregation and decryption paths so the dashboard stays usable even if server-side HE interop fails in specific runtime environments.

---

## Features

- Client-side CKKS encryption for expense amounts via `node-seal` (WASM)
- Homomorphic aggregation on the backend with TenSEAL
- Dashboard with decrypted totals and per-category analytics (locally decrypted)
- Date filters: day, week, month, custom range
- Multi-currency support (default: LKR)
- Full expense CRUD: add, edit, delete
- Vault settings: key rotation, backup, default currency, CSV export

---

## Tech stack

**Frontend** — React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, node-seal (WASM)

**Backend** — FastAPI, SQLAlchemy, SQLite, TenSEAL

**Infrastructure** — Docker, Docker Compose, Nginx (SPA fallback)

---

## Running locally

### Docker (recommended)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |

Useful commands:

```bash
docker compose up -d                        # run detached
docker compose logs -f backend              # stream backend logs
docker compose logs -f frontend             # stream frontend logs
docker compose down                         # stop all services
```

### Manual setup

**Backend:**

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows; use source venv/bin/activate on macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

The frontend reads the backend base URL from `frontend/.env` (`VITE_BACKEND_API_URL`) and defaults to `http://localhost:8000` if unset.

---

## Project structure

```
backend/     FastAPI app, DB models, schemas, TenSEAL HE logic
frontend/    React app, UI components, node-seal WASM crypto
```

The `seal_throws.wasm` and related public assets are served from `frontend/public`. Nginx is configured with an SPA fallback so routes like `/dashboard` and `/settings` work on hard refresh.

---

## Troubleshooting

**Backend fails with missing modules** — rebuild the backend image:

```bash
docker compose build backend --no-cache
docker compose up -d backend
```

**Frontend shows stale assets** — rebuild and hard refresh:

```bash
docker compose build frontend --no-cache
docker compose up -d frontend
# Then Ctrl+F5 in the browser
```
