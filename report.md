# CipherSpend Cloud: System Architecture & Encryption Workflows

CipherSpend Cloud is a Zero-Knowledge SaaS expense tracker. This means the server never sees your raw financial data in plaintext. Instead, the system relies on a combination of **Symmetric Encryption (AES-GCM)**, **Key Derivation (PBKDF2)**, and **Fully Homomorphic Encryption (FHE via Microsoft SEAL/tenSEAL)** to keep your data completely private while still allowing the server to perform analytics.

Here is a detailed breakdown of how the system works through its core cryptographic workflows.

---

## Workflow 1: Registration & Key Vault Generation

When a new user signs up, the browser must create the cryptographic keys that will secure their entire account. 

1. **User Input:** The user provides an email and a master passphrase.
2. **Key Generation (FHE):** The client's browser (using `node-seal` WebAssembly) generates a brand new **CKKS Public Key (`pk`)** and **Secret Key (`sk`)**.
   - The Public Key is used to encrypt data.
   - The Secret Key is used to decrypt data.
3. **Key Derivation (PBKDF2):** The browser generates a random `salt` and hashes the user's master passphrase using PBKDF2 to create a symmetric **Key Encryption Key (KEK)**.
4. **Key Wrapping (AES-GCM):** Because the FHE Secret Key (`sk`) is too sensitive to store anywhere, the browser encrypts it using the KEK via AES-GCM. The result is a `wrapped_sk`.
5. **Payload to Server:** The client sends the `email`, `hashed_password`, `salt`, `pk`, and `wrapped_sk` to the backend. 
   - *Result:* The server has the keys required, but since it doesn't have the user's plaintext passphrase, it can never unwrap the Secret Key.

---

## Workflow 2: Login & Session Unlock

To read or write data, the browser needs to reconstruct the FHE keys in local memory.

1. **Authentication:** The user sends their email and passphrase to the FastAPI backend.
2. **Server Response:** The backend validates the credentials and returns a JWT access token along with the user's `salt`, `pk`, and `wrapped_sk`.
3. **Key Unwrap:** 
   - The browser re-derives the identical **KEK** using the provided passphrase and the downloaded `salt` (PBKDF2).
   - The browser uses this KEK to decrypt the `wrapped_sk` (AES-GCM), revealing the raw FHE Secret Key (`sk`).
4. **Context Hydration:** The decrypted `sk` and the `pk` are loaded into the browser's `node-seal` memory context. The vault is now "unlocked" locally.

---

## Workflow 3: Edge Encryption (Adding an Expense)

When a user adds an expense, the financial amount is encrypted *before* it leaves the device.

1. **User Input:** The user types an expense amount (e.g., `$45.50`) and selects a category (e.g., "Food").
2. **FHE Encryption:** The browser converts the number into a CKKS plaintext and encrypts it using the active Public Key (`pk`). This creates a mathematically noisy **Ciphertext** (base64 string).
3. **Transmission:** The client posts the base64 ciphertext alongside plaintext metadata (category, date, description) to the backend.
   - *Result:* The SQLite database stores `amountCiphertext = "gAQAABAAAAA..."`. The server has no mathematical way to read the original `$45.50`.

---

## Workflow 4: Blind Homomorphic Aggregation (Analytics)

The standout feature of CipherSpend is the ability to sum up expenses on the server without decrypting them.

1. **Client Request:** The Dashboard requests the total spending breakdown by category.
2. **Server Filtering:** The FastAPI backend groups the encrypted expenses by category (e.g., all ciphertexts under "Food", "Transport").
3. **Homomorphic Addition (`tenSEAL`):** The backend uses the `tenSEAL` Python library to perform a homomorphic addition operation directly on the ciphertexts. 
   - Mathematically: `Ciphertext(A) + Ciphertext(B) = Ciphertext(A + B)`
   - The server effectively sums up the spending without ever knowing what the individual or final amounts are.
4. **Transmission:** The server sends back a single aggregated ciphertext for each category.

---

## Workflow 5: Local Decryption & Render

The final step is turning the encrypted math back into human-readable charts on the user's screen.

1. **Receive Aggregate:** The browser receives the aggregated ciphertexts from the server.
2. **FHE Decryption:** Using the locally unwrapped Secret Key (`sk`) securely held in the `node-seal` memory context, the browser decrypts the ciphertexts back into floating-point numbers.
3. **UI Render:** The decrypted numbers are rounded and fed directly into the `shadcn/ui` Recharts components to display the final pie and bar charts.
4. **Zero-Knowledge Guarantee:** When the user clicks "Export CSV", the browser fetches all individual ciphertexts, decrypts them locally via the exact same method, and generates a downloadable file entirely inside the browser's memory—bypassing the server completely.
