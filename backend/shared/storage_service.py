"""
PostgreSQL Storage Adapter for A7SYSTEM.
Provides a local file storage bucket mimicking google-cloud-storage.
"""
import os

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

class LocalBlob:
    def __init__(self, path: str):
        self.path = path.replace("\\", "/")
        self.full_path = os.path.join(UPLOAD_DIR, self.path)
        os.makedirs(os.path.dirname(self.full_path), exist_ok=True)
        self.public_url = f"/uploads/{self.path}"

    def upload_from_string(self, data: bytes, content_type: str = "application/octet-stream"):
        with open(self.full_path, "wb") as f:
            f.write(data)

    def make_public(self):
        pass

class LocalBucket:
    def blob(self, path: str) -> LocalBlob:
        return LocalBlob(path)

_bucket = LocalBucket()

def get_storage_bucket() -> LocalBucket:
    return _bucket
