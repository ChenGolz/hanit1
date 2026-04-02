"""Hosted-only security scaffolding for the future PetConnect backend.

Do not expose raw owner phone numbers or verification answers in public APIs.
This file is a starter for the hosted FastAPI phase, not something the
GitHub Pages build executes directly.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass


def hash_verification_answer(answer: str, salt: str | None = None) -> tuple[str, str]:
    """Return a salted PBKDF2 hash for a verification answer."""
    clean = answer.strip().lower()
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', clean.encode('utf-8'), salt.encode('utf-8'), 120_000)
    return salt, digest.hex()


def verify_verification_answer(answer: str, salt: str, expected_hash: str) -> bool:
    _, actual = hash_verification_answer(answer, salt=salt)
    return hmac.compare_digest(actual, expected_hash)


@dataclass(slots=True)
class OwnerWallPolicy:
    show_verification_prompt: bool = True
    reveal_phone_only_after_proof: bool = True
    require_photo_proof: bool = True
    temporary_contact_proxy: bool = True
