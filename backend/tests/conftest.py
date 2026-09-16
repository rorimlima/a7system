import pytest
from unittest.mock import patch, MagicMock

@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    """Basic setup: mock environment variables for tests."""
    monkeypatch.setenv("FIREBASE_PROJECT_ID", "test-project")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")

@pytest.fixture
def mock_firestore():
    """Fixture for mocking Firestore client (patch firebase_admin)."""
    with patch("firebase_admin.firestore.client") as mock_client:
        mock_db = MagicMock()
        mock_client.return_value = mock_db
        yield mock_db

@pytest.fixture
def mock_auth():
    """Fixture for mocking Auth client."""
    with patch("firebase_admin.auth") as mock_auth_module:
        yield mock_auth_module
