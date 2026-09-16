"""
Firestore helper functions with support for multi-tenancy.
"""
from typing import Dict, Any, List, Optional, Callable, Tuple
from google.cloud.firestore import Query
from shared.firebase_init import get_firestore_client
from shared.errors import NotFoundError, ForbiddenError

def get_document(collection: str, doc_id: str, empresa_id: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve a document by ID. Validates company ID if provided."""
    db = get_firestore_client()
    doc_ref = db.collection(collection).document(doc_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise NotFoundError(f"Document {doc_id} not found in {collection}.")
        
    data = doc.to_dict()
    data['id'] = doc.id
    
    if empresa_id and data.get('empresaId') != empresa_id:
        raise ForbiddenError("Access to this document is denied.")
        
    return data

def list_documents(
    collection: str, 
    filters: List[Tuple[str, str, Any]] = None, 
    order_by: str = None, 
    limit: int = 50, 
    offset: int = None,
    empresa_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """List documents with optional filtering, ordering, and pagination."""
    db = get_firestore_client()
    query = db.collection(collection)
    
    if empresa_id:
        query = query.where("empresaId", "==", empresa_id)
        
    if filters:
        for f in filters:
            query = query.where(f[0], f[1], f[2])
            
    if order_by:
        # Defaults to descending if prefixed with '-'
        if order_by.startswith('-'):
            query = query.order_by(order_by[1:], direction=Query.DESCENDING)
        else:
            query = query.order_by(order_by)
            
    if limit:
        query = query.limit(limit)
        
    if offset:
        query = query.offset(offset)
        
    results = []
    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        results.append(data)
        
    return results

def create_document(collection: str, data: Dict[str, Any], doc_id: Optional[str] = None) -> str:
    """Create a new document. Automatically sets creation timestamp."""
    db = get_firestore_client()
    coll_ref = db.collection(collection)
    
    if doc_id:
        doc_ref = coll_ref.document(doc_id)
        doc_ref.set(data)
    else:
        _, doc_ref = coll_ref.add(data)
        
    return doc_ref.id

def update_document(collection: str, doc_id: str, data: Dict[str, Any], empresa_id: Optional[str] = None) -> None:
    """Update an existing document. Enforces company isolation if required."""
    if empresa_id:
        # Check ownership first
        get_document(collection, doc_id, empresa_id)
        
    db = get_firestore_client()
    doc_ref = db.collection(collection).document(doc_id)
    doc_ref.update(data)

def delete_document(collection: str, doc_id: str, empresa_id: Optional[str] = None) -> None:
    """Delete a document. Enforces company isolation if required."""
    if empresa_id:
        # Check ownership first
        get_document(collection, doc_id, empresa_id)
        
    db = get_firestore_client()
    doc_ref = db.collection(collection).document(doc_id)
    doc_ref.delete()

def run_transaction(callback: Callable) -> Any:
    """Execute a function within a Firestore transaction."""
    db = get_firestore_client()
    transaction = db.transaction()
    return callback(transaction, db)

def batch_write(operations: List[Callable]) -> None:
    """Execute multiple writes in a single batch operation."""
    db = get_firestore_client()
    batch = db.batch()
    
    for op in operations:
        op(batch, db)
        
    batch.commit()
