import pytest
from shared.errors import (
    A7SystemError,
    NotFoundError,
    ForbiddenError,
    ValidationError,
    ConflictError,
    InsufficientStockError
)

def test_not_found_error():
    """Test NotFoundError sets status 404 and correct message."""
    err = NotFoundError("User not found")
    assert err.status_code == 404
    assert err.detail == "User not found"

def test_forbidden_error():
    """Test ForbiddenError sets status 403."""
    err = ForbiddenError("Access denied")
    assert err.status_code == 403
    assert err.detail == "Access denied"

def test_validation_error():
    """Test ValidationError sets status 422."""
    err = ValidationError("Invalid input")
    assert err.status_code == 422
    assert err.detail == "Invalid input"

def test_conflict_error():
    """Test ConflictError sets status 409."""
    err = ConflictError("Resource already exists")
    assert err.status_code == 409
    assert err.detail == "Resource already exists"

def test_insufficient_stock_error():
    """Test InsufficientStockError sets status 422 and inherits from ValidationError."""
    err = InsufficientStockError("Not enough items in stock")
    assert err.status_code == 422
    assert err.detail == "Not enough items in stock"
    assert isinstance(err, ValidationError)
    assert isinstance(err, A7SystemError)

def test_a7system_error_default():
    """Test A7SystemError base class defaults to status 500."""
    err = A7SystemError("Internal error")
    assert err.status_code == 500
    assert err.detail == "Internal error"

def test_custom_message():
    """Test that custom message is preserved in exceptions."""
    custom_msg = "A very specific error occurred."
    err = A7SystemError(custom_msg)
    assert err.detail == custom_msg
