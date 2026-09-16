import pytest
from shared.validators import (
    validate_cpf,
    validate_cnpj,
    validate_email,
    validate_phone,
    sanitize_string
)

def test_validate_cpf_valid():
    """Test valid real CPF."""
    assert validate_cpf("529.982.247-25") == True
    assert validate_cpf("52998224725") == True

def test_validate_cpf_invalid():
    """Test invalid CPF."""
    assert validate_cpf("123.456.789-00") == False
    assert validate_cpf("111.111.111-12") == False

def test_validate_cpf_all_same_digits():
    """Test CPF with all same digits."""
    assert validate_cpf("111.111.111-11") == False
    assert validate_cpf("00000000000") == False

def test_validate_cpf_with_mask():
    """Test CPF with mask works."""
    assert validate_cpf("529.982.247-25") == True
    assert validate_cpf("  529.982.247-25  ") == True

def test_validate_cnpj_valid():
    """Test valid CNPJ."""
    assert validate_cnpj("11.222.333/0001-81") == True
    assert validate_cnpj("11222333000181") == True

def test_validate_cnpj_invalid():
    """Test invalid CNPJ."""
    assert validate_cnpj("11.222.333/0001-00") == False
    assert validate_cnpj("00000000000000") == False

def test_validate_email_valid():
    """Test valid emails."""
    assert validate_email("test@example.com") == True
    assert validate_email("user.name+tag@domain.co.uk") == True

def test_validate_email_invalid():
    """Test invalid emails."""
    assert validate_email("plainaddress") == False
    assert validate_email("@no-local-part.com") == False
    assert validate_email("test@.com") == False

def test_validate_phone_valid():
    """Test valid phone numbers with 10-11 digits."""
    assert validate_phone("11987654321") == True # 11 digits
    assert validate_phone("1134567890") == True  # 10 digits
    assert validate_phone("(11) 98765-4321") == True

def test_validate_phone_invalid():
    """Test phone numbers with less than 10 digits."""
    assert validate_phone("123456789") == False
    assert validate_phone("abcdefghij") == False
    assert validate_phone("") == False

def test_sanitize_string():
    """Test string sanitization (removes HTML, trims whitespace)."""
    assert sanitize_string("  hello world  ") == "hello world"
    assert sanitize_string("<script>alert('xss')</script>hello") == "alert('xss')hello"
    assert sanitize_string("<h1>Title</h1>") == "Title"

def test_sanitize_string_empty():
    """Test empty string returns empty."""
    assert sanitize_string("") == ""
    assert sanitize_string(None) == None
