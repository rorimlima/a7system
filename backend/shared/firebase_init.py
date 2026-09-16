"""
Supabase PostgreSQL singleton adapter.
Redirects calls to PostgreSQL database and local storage.
"""
import logging
from shared.firestore_client import get_firestore_client, get_db, SERVER_TIMESTAMP
from shared.storage_service import get_storage_bucket
from shared.jwt_auth import decode_access_token

logger = logging.getLogger(__name__)

class AuthAdapter:
    def verify_id_token(self, token: str) -> dict:
        return decode_access_token(token)

_auth_adapter = AuthAdapter()

def initialize_database() -> None:
    """No-op initialization for PostgreSQL environment."""
    logger.info("Database backend initialized with Supabase PostgreSQL.")

# Alias for backward compatibility
initialize_firebase = initialize_database

def get_auth_client() -> AuthAdapter:
    return _auth_adapter
