"""
CKKS homomorphic encryption operations for CipherSpend.

Each expense amount is encrypted as a single-element CKKS vector.
Summation is performed homomorphically on ciphertexts; only the
final aggregate is decrypted.
"""
import base64
import json
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import tenseal as ts

# ── CKKS parameters ──────────────────────────────────────────────────────────
# poly_modulus_degree=8192 gives ~128-bit security and supports batching up
# to 4096 values.  For pure addition (no multiplication) we need minimal
# coefficient moduli levels but we keep a few for noise headroom.
_POLY_MOD_DEGREE = 8192
_COEFF_MOD_BITS  = [60, 40, 40, 60]
_SCALE           = 2 ** 40
_PBKDF2_ITERS    = 600_000
_AES_KEY_LEN     = 32
_SALT_LEN        = 16
_NONCE_LEN       = 12


def create_context() -> ts.Context:
    """Generate a fresh CKKS context with a new key pair."""
    ctx = ts.context(
        ts.SCHEME_TYPE.CKKS,
        poly_modulus_degree=_POLY_MOD_DEGREE,
        coeff_mod_bit_sizes=_COEFF_MOD_BITS,
    )
    ctx.global_scale = _SCALE
    return ctx


def serialize_context(ctx: ts.Context, include_sk: bool = True) -> bytes:
    """Serialize context to bytes.  Set include_sk=True for backups."""
    return ctx.serialize(save_secret_key=include_sk)


def load_context(data: bytes) -> ts.Context:
    """Deserialize context from bytes."""
    return ts.context_from(data)


def encrypt_amount(ctx: ts.Context, amount: float) -> bytes:
    """Encrypt a single monetary amount; returns serialized ciphertext bytes."""
    vec = ts.ckks_vector(ctx, [float(amount)])
    return vec.serialize()


def decrypt_sum(ctx: ts.Context, ciphertext_bytes_list: list[bytes]) -> float:
    """
    Compute the homomorphic sum of a list of serialized ciphertexts and
    decrypt only the aggregate result.

    Returns 0.0 for an empty list.
    """
    if not ciphertext_bytes_list:
        return 0.0

    vectors = [ts.ckks_vector_from(ctx, b) for b in ciphertext_bytes_list]
    total = vectors[0]
    for v in vectors[1:]:
        total = total + v

    return total.decrypt()[0]


def decrypt_sum_with_health(
    ctx: ts.Context,
    ciphertext_bytes_list: list[bytes],
    drift_threshold: float = 0.005,
    refresh_term_threshold: int = 200,
) -> tuple[float, float, bool]:
    """
    Decrypt homomorphic sum and optionally refresh aggregate ciphertext if
    precision drift or operand count crosses threshold.
    """
    if not ciphertext_bytes_list:
        return 0.0, 0.0, False

    raw_total = decrypt_sum(ctx, ciphertext_bytes_list)
    drift = abs(raw_total - round(raw_total, 2))
    should_refresh = drift > drift_threshold or len(ciphertext_bytes_list) >= refresh_term_threshold
    if not should_refresh:
        return raw_total, drift, False

    refreshed_ct = encrypt_amount(ctx, raw_total)
    refreshed_total = ts.ckks_vector_from(ctx, refreshed_ct).decrypt()[0]
    return refreshed_total, drift, True


def ciphertext_to_display(ciphertext_bytes: bytes, max_chars: int = 36) -> str:
    """
    Return a display-safe, truncated base64 representation of a ciphertext,
    suitable for showing in the UI as visual proof of encryption.
    """
    b64 = base64.b64encode(ciphertext_bytes).decode("ascii")
    if len(b64) > max_chars:
        return b64[:max_chars] + "…"
    return b64


def _derive_kek(passphrase: str, salt: bytes, iterations: int = _PBKDF2_ITERS) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=_AES_KEY_LEN,
        salt=salt,
        iterations=iterations,
    )
    return kdf.derive(passphrase.encode("utf-8"))


def encrypt_key_material(key_bytes: bytes, passphrase: str) -> bytes:
    """Encrypt serialized TenSEAL context bytes for at-rest storage."""
    salt = os.urandom(_SALT_LEN)
    nonce = os.urandom(_NONCE_LEN)
    kek = _derive_kek(passphrase, salt)
    ciphertext = AESGCM(kek).encrypt(nonce, key_bytes, None)
    envelope = {
        "version": 1,
        "kdf": "pbkdf2-hmac-sha256",
        "iterations": _PBKDF2_ITERS,
        "salt_b64": base64.b64encode(salt).decode("ascii"),
        "nonce_b64": base64.b64encode(nonce).decode("ascii"),
        "ciphertext_b64": base64.b64encode(ciphertext).decode("ascii"),
    }
    return json.dumps(envelope, separators=(",", ":")).encode("utf-8")


def decrypt_key_material(envelope_bytes: bytes, passphrase: str) -> bytes:
    """Decrypt an encrypted key envelope produced by encrypt_key_material()."""
    envelope = json.loads(envelope_bytes.decode("utf-8"))
    iterations = int(envelope["iterations"])
    salt = base64.b64decode(envelope["salt_b64"])
    nonce = base64.b64decode(envelope["nonce_b64"])
    ciphertext = base64.b64decode(envelope["ciphertext_b64"])
    kek = _derive_kek(passphrase, salt, iterations=iterations)
    return AESGCM(kek).decrypt(nonce, ciphertext, None)


def is_valid_key_envelope(envelope_bytes: bytes) -> bool:
    try:
        envelope = json.loads(envelope_bytes.decode("utf-8"))
        required = {"version", "kdf", "iterations", "salt_b64", "nonce_b64", "ciphertext_b64"}
        if not required.issubset(envelope.keys()):
            return False
        base64.b64decode(envelope["salt_b64"])
        base64.b64decode(envelope["nonce_b64"])
        base64.b64decode(envelope["ciphertext_b64"])
        return True
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return False
