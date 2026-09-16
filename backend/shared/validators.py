"""
Validation functions and utilities for the A7SYSTEM.
"""
import re
import html
from datetime import datetime
import random
import string

def validate_cpf(cpf: str) -> bool:
    """Validate a Brazilian CPF."""
    cpf = re.sub(r'[^0-9]', '', cpf)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    
    def calc_digit(cpf_slice):
        s = sum(int(d) * w for d, w in zip(cpf_slice, range(len(cpf_slice) + 1, 1, -1)))
        rem = s % 11
        return 0 if rem < 2 else 11 - rem

    d1 = calc_digit(cpf[:9])
    d2 = calc_digit(cpf[:9] + str(d1))
    return cpf[-2:] == f"{d1}{d2}"

def validate_cnpj(cnpj: str) -> bool:
    """Validate a Brazilian CNPJ."""
    cnpj = re.sub(r'[^0-9]', '', cnpj)
    if len(cnpj) != 14 or cnpj == cnpj[0] * 14:
        return False
    
    def calc_digit(cnpj_slice, weights):
        s = sum(int(d) * w for d, w in zip(cnpj_slice, weights))
        rem = s % 11
        return 0 if rem < 2 else 11 - rem

    weights_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    d1 = calc_digit(cnpj[:12], weights_1)
    
    weights_2 = [6] + weights_1
    d2 = calc_digit(cnpj[:12] + str(d1), weights_2)
    
    return cnpj[-2:] == f"{d1}{d2}"

def validate_email(email: str) -> bool:
    """Validate an email address."""
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email))

def sanitize_string(text: str) -> str:
    """Remove HTML tags and trim string."""
    if not text:
        return ""
    # Strip HTML tags
    clean_text = re.sub(r'<[^>]*>', '', text)
    # Unescape HTML entities and strip whitespace
    return html.unescape(clean_text).strip()

def validate_phone(phone: str) -> bool:
    """Validate a Brazilian phone number (with or without DDD)."""
    phone = re.sub(r'[^0-9]', '', phone)
    return 10 <= len(phone) <= 11

def generate_product_code() -> str:
    """Generate a product code in the format A7 + YYYYMMDDHHmmss."""
    now = datetime.now()
    return f"A7{now.strftime('%Y%m%d%H%M%S')}"

def generate_order_number() -> str:
    """Generate an order number in the format A7 + random digits."""
    random_digits = ''.join(random.choices(string.digits, k=8))
    return f"A7{random_digits}"
