"""Tests for Solana service."""
import pytest
from app.utils.solana_utils import is_valid_solana_address, truncate_address


class TestSolanaUtils:
    def test_valid_address(self):
        assert is_valid_solana_address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")

    def test_invalid_address(self):
        assert not is_valid_solana_address("invalid")
        assert not is_valid_solana_address("")
        assert not is_valid_solana_address("0x" + "a" * 40)  # Ethereum address

    def test_truncate_address(self):
        addr = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        result = truncate_address(addr, 4)
        assert result == "EPjF...Dt1v"
