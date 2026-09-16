import pytest
from auth.services import validate_password_strength

def test_password_strong():
    """Test strong password returns True."""
    assert validate_password_strength("StrongP@ssw0rd") == True
    assert validate_password_strength("Valid123!") == True

def test_password_no_uppercase():
    """Test password without uppercase returns False."""
    assert validate_password_strength("weakp@ssw0rd") == False

def test_password_no_lowercase():
    """Test password without lowercase returns False."""
    assert validate_password_strength("WEAKP@SSW0RD") == False

def test_password_no_number():
    """Test password without number returns False."""
    assert validate_password_strength("StrongP@ssword") == False

def test_password_no_special():
    """Test password without special character returns False."""
    assert validate_password_strength("StrongPassw0rd") == False

def test_password_too_short():
    """Test password with less than 8 characters returns False."""
    assert validate_password_strength("Sh0rt!") == False

def test_password_minimum_valid():
    """Test password with exactly 8 characters and all requirements returns True."""
    assert validate_password_strength("Va1id!8c") == True
