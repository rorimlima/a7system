"""
Audit logging system to track user actions across the platform.
"""
from typing import Optional, Any, Dict
from datetime import datetime, timezone
from shared.firestore_client import create_document
import logging

logger = logging.getLogger(__name__)

def log_action(
    empresa_id: str, 
    user_id: str, 
    acao: str, 
    alvo: str, 
    antes: Optional[Dict[str, Any]] = None, 
    depois: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log an action into the 'auditoria' collection in Firestore.
    
    Args:
        empresa_id: The ID of the company where the action occurred.
        user_id: The ID of the user performing the action.
        acao: Action name (e.g., 'CREATE', 'UPDATE', 'DELETE').
        alvo: The target entity (e.g., 'Product/123').
        antes: The state before the action.
        depois: The state after the action.
    """
    try:
        audit_data = {
            "empresaId": empresa_id,
            "usuarioId": user_id,
            "acao": acao,
            "alvo": alvo,
            "timestamp": datetime.now(timezone.utc),
        }
        
        if antes is not None:
            audit_data["antes"] = antes
            
        if depois is not None:
            audit_data["depois"] = depois
            
        create_document("auditoria", audit_data)
        logger.debug(f"Audit log created: {acao} on {alvo} by {user_id}")
    except Exception as e:
        logger.error(f"Failed to create audit log for {acao} on {alvo}: {str(e)}")
        # Do not raise to avoid breaking the main workflow
