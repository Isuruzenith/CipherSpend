"""
CKKS homomorphic encryption operations for CipherSpend.

Each expense amount is encrypted as a single-element CKKS vector.
Summation is performed homomorphically on ciphertexts; only the
final aggregate is decrypted.
"""
import base64
import tenseal as ts

# ── CKKS parameters ──────────────────────────────────────────────────────────
# poly_modulus_degree=8192 gives ~128-bit security and supports batching up
# to 4096 values.  For pure addition (no multiplication) we need minimal
# coefficient moduli levels but we keep a few for noise headroom.
_POLY_MOD_DEGREE = 8192
_COEFF_MOD_BITS  = [60, 40, 40, 60]
_SCALE           = 2 ** 40


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


def ciphertext_to_display(ciphertext_bytes: bytes, max_chars: int = 36) -> str:
    """
    Return a display-safe, truncated base64 representation of a ciphertext,
    suitable for showing in the UI as visual proof of encryption.
    """
    b64 = base64.b64encode(ciphertext_bytes).decode("ascii")
    if len(b64) > max_chars:
        return b64[:max_chars] + "…"
    return b64
