from datetime import datetime
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from shared.firestore_client import create_document, update_document, get_document, list_documents
from shared.storage_service import get_storage_bucket
from shared.audit import log_action

COMPANIES_COLLECTION = "empresas"

def create_company(data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Cria uma nova empresa."""
    data["criadoEm"] = datetime.now(timezone.utc).isoformat()
    data["atualizadoEm"] = datetime.now(timezone.utc).isoformat()
    
    company_id = create_document(COMPANIES_COLLECTION, data)
    
    # Audit log
    log_action(company_id, user_id, "CREATE", "empresa", None, data)
    
    created = get_document(COMPANIES_COLLECTION, company_id)
    return created

def update_company(company_id: str, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Atualiza dados de uma empresa existente."""
    antes = get_document(COMPANIES_COLLECTION, company_id)
    if not antes:
        raise ValueError("Empresa não encontrada.")
        
    data["atualizadoEm"] = datetime.now(timezone.utc).isoformat()
    update_document(COMPANIES_COLLECTION, company_id, data)
    
    depois = get_document(COMPANIES_COLLECTION, company_id)
    log_action(company_id, user_id, "UPDATE", "empresa", antes, depois)
    return depois

def get_company(company_id: str) -> Optional[Dict[str, Any]]:
    """Busca detalhes de uma empresa."""
    return get_document(COMPANIES_COLLECTION, company_id)

def list_companies(empresa_ids: List[str]) -> List[Dict[str, Any]]:
    """Lista empresas pertencentes aos ids informados."""
    if not empresa_ids:
        return []
    
    all_companies = []
    # Busca em chunks se necessário.
    for i in range(0, len(empresa_ids), 10):
        chunk = empresa_ids[i:i+10]
        filters = [("id", "in", chunk)]
        # Alternatively we can just fetch each one
    
    # Safer: fetch each company document by ID since empresa_ids are document IDs
    for eid in empresa_ids:
        doc = get_document(COMPANIES_COLLECTION, eid)
        if doc:
            all_companies.append(doc)
            
    return all_companies

def upload_company_logo(company_id: str, file_bytes: bytes, file_ext: str, user_id: str) -> str:
    """Faz upload da logo da empresa para o Storage."""
    bucket = get_storage_bucket()
    blob_path = f"logos/{company_id}/logo.{file_ext}"
    blob = bucket.blob(blob_path)
    
    # Set content type based on extension
    content_type = "image/png"
    if file_ext.lower() in ["jpg", "jpeg"]:
        content_type = "image/jpeg"
        
    blob.upload_from_string(file_bytes, content_type=content_type)
    blob.make_public()
    logo_url = blob.public_url
    
    # Atualiza doc da empresa
    update_company(company_id, {"logoUrl": logo_url}, user_id)
    return logo_url
