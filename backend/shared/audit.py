"""
Audit logging system to track user actions across the platform in PostgreSQL.
"""
from typing import Optional, Any, Dict
from datetime import datetime, timezone
import uuid
import logging
from shared.database import SessionLocal
from shared.models import LogAuditoria

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
    Log an action into the 'logs_auditoria' table in PostgreSQL.
    """
    db = SessionLocal()
    try:
        emp_id = None
        if empresa_id and empresa_id != "none":
            try:
                candidate_id = uuid.UUID(str(empresa_id))
                from shared.models import Empresa
                if db.query(Empresa).filter(Empresa.id == candidate_id).first():
                    emp_id = candidate_id
            except (ValueError, Exception):
                emp_id = None
                
        usr_id = None
        if user_id and user_id != "none":
            try:
                usr_id = uuid.UUID(str(user_id))
            except ValueError:
                pass

        from shared.firestore_client import clean_data

        log_entry = LogAuditoria(
            empresa_id=emp_id,
            usuario_id=usr_id,
            acao=acao,
            entidade=alvo.split("/")[0] if "/" in alvo else alvo,
            entidade_id=alvo.split("/")[1] if "/" in alvo else alvo,
            dados_anteriores=clean_data(antes) if isinstance(antes, dict) else antes,
            dados_novos=clean_data(depois) if isinstance(depois, dict) else depois
        )
        db.add(log_entry)
        db.commit()
        logger.debug(f"Audit log created: {acao} on {alvo} by {user_id}")
    except Exception as e:
        logger.error(f"Failed to create audit log for {acao} on {alvo}: {str(e)}")
        db.rollback()
    finally:
        db.close()

# Alias for compatibility
create_audit_log = log_action

