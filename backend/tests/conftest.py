import pytest
from unittest.mock import patch, MagicMock

@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    """Basic setup: mock environment variables for tests."""
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")

@pytest.fixture
def mock_db():
    """Fixture for mocking the PostgreSQL database adapter."""
    with patch("shared.firestore_client.get_firestore_client") as mock_get_db:
        mock_adapter = MagicMock()
        mock_get_db.return_value = mock_adapter
        yield mock_adapter

@pytest.fixture
def mock_auth():
    """Fixture for mocking JWT auth."""
    with patch("shared.jwt_auth.decode_access_token") as mock_decode:
        yield mock_decode
