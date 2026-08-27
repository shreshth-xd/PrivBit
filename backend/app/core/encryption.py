import os
import base64
import secrets

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_KEK_B64 = os.getenv("ENCRYPTION_KEK")
if not _KEK_B64:
    raise RuntimeError("ENCRYPTION_KEK environment variable is not set")

KEK: bytes = base64.b64decode(_KEK_B64)  # 32 raw bytes, AES-256


def _encrypt(key: bytes, plaintext: bytes) -> bytes:
    """AES-GCM encrypt. Returns nonce (12 bytes) prepended to ciphertext+tag,
    so the whole thing is one storable blob."""
    aesgcm = AESGCM(key)
    nonce = secrets.token_bytes(12)  # GCM standard nonce size; never reuse per key
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return nonce + ciphertext


def _decrypt(key: bytes, blob: bytes) -> bytes:
    aesgcm = AESGCM(key)
    nonce, ciphertext = blob[:12], blob[12:]
    return aesgcm.decrypt(nonce, ciphertext, None)  # raises if tampered/wrong key


# --- Per-user DEK lifecycle ---

def generate_dek() -> bytes:
    """A fresh random 256-bit key, generated once per user at registration."""
    return AESGCM.generate_key(bit_length=256)


def encrypt_dek(dek: bytes) -> bytes:
    """KEK wraps the DEK — this is what gets stored on the User row."""
    return _encrypt(KEK, dek)


def decrypt_dek(encrypted_dek: bytes) -> bytes:
    return _decrypt(KEK, encrypted_dek)


# --- Chunk-level encryption, using a user's DEK (not the KEK directly) ---

def encrypt_chunk(dek: bytes, plaintext: str) -> bytes:
    return _encrypt(dek, plaintext.encode("utf-8"))


def decrypt_chunk(dek: bytes, blob: bytes) -> str:
    return _decrypt(dek, blob).decode("utf-8")