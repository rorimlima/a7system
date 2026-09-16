"""
Firebase Admin initialization singleton.
"""
import logging
from threading import Lock
from typing import Optional
import firebase_admin
from firebase_admin import credentials, firestore, auth, storage

logger = logging.getLogger(__name__)

class FirebaseManager:
    _instance: Optional["FirebaseManager"] = None
    _lock: Lock = Lock()
    
    def __init__(self):
        self._app = None
        self._firestore_client = None
        self._auth_client = auth
        self._storage_bucket = None

    @classmethod
    def get_instance(cls) -> "FirebaseManager":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def initialize(self) -> None:
        """Initialize the Firebase Admin SDK using Application Default Credentials."""
        if self._app is None:
            with self._lock:
                if self._app is None:
                    try:
                        # Uses GOOGLE_APPLICATION_CREDENTIALS environment variable
                        cred = credentials.ApplicationDefault()
                        self._app = firebase_admin.initialize_app(cred)
                        logger.info("Firebase Admin SDK initialized successfully.")
                    except Exception as e:
                        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
                        raise

    def get_firestore_client(self):
        if self._firestore_client is None:
            self.initialize()
            self._firestore_client = firestore.client()
        return self._firestore_client
    
    def get_auth_client(self):
        if self._app is None:
            self.initialize()
        return self._auth_client
        
    def get_storage_bucket(self):
        if self._storage_bucket is None:
            self.initialize()
            self._storage_bucket = storage.bucket()
        return self._storage_bucket

def initialize_firebase() -> None:
    """Helper to explicitly initialize Firebase at app startup."""
    FirebaseManager.get_instance().initialize()

def get_firestore_client():
    """Get the initialized Firestore client."""
    return FirebaseManager.get_instance().get_firestore_client()

def get_auth_client():
    """Get the initialized Auth client."""
    return FirebaseManager.get_instance().get_auth_client()

def get_storage_bucket():
    """Get the initialized Storage bucket."""
    return FirebaseManager.get_instance().get_storage_bucket()
