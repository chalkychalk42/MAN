"""Low-level Solana address and lamport helpers."""

from __future__ import annotations

import base64
import re

# Base-58 alphabet used by Solana / Bitcoin
_B58_ALPHABET = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_B58_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]+$")

LAMPORTS_PER_SOL: int = 1_000_000_000


def is_valid_solana_address(address: str) -> bool:
    """Return *True* if *address* looks like a valid base-58 Solana public key.

    This performs a format check only (32-44 base-58 characters). It does
    **not** verify that the address exists on-chain.
    """
    if not isinstance(address, str):
        return False
    if not 32 <= len(address) <= 44:
        return False
    return bool(_B58_RE.match(address))


def lamports_to_sol(lamports: int) -> float:
    """Convert lamports to SOL."""
    return lamports / LAMPORTS_PER_SOL


def sol_to_lamports(sol: float) -> int:
    """Convert SOL to lamports (rounded to nearest integer)."""
    return round(sol * LAMPORTS_PER_SOL)


def truncate_address(address: str, chars: int = 4) -> str:
    """Shorten an address for display, e.g. ``AbCd...XyZw``."""
    if len(address) <= chars * 2 + 3:
        return address
    return f"{address[:chars]}...{address[-chars:]}"
