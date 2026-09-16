from fastapi import APIRouter, Depends, Query, Header, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from google.cloud import firestore

from shared.auth_middleware import get_current_user, require_role, UserContext
from shared.validators import sanitize_string, validate_cnpj, validate_cpf, validate_phone
from shared.errors import NotFoundError, ForbiddenError, ValidationError, ConflictError
from shared.firestore_client import create_document, update_document, get_document, list_documents, delete_document
from shared.audit import log_action

router = APIRouter()
FORNECEDORES_COLLECTION = "fornecedores"

class FornecedorCreate(BaseModel):
    empresaId: str
    nome: str = Field(..., min_length=2)
    cnpjCpf: Optional[str] = None
    celular: Optional[str] = None
    fone: Optional[str] = None
    endereco: Optional[str] = None

class FornecedorUpdate(BaseModel):
    nome: Optional[str] = None
    cnpjCpf: Optional[str] = None
    celular: Optional[str] = None
    fone: Optional[str] = None
    endereco: Optional[str] = None
    ativo: Optional[bool] = None

def get_empresa_id(
    empresaId: Optional[str] = Query(None), 
    x_empresa_id: Optional[str] = Header(None, alias="X-Empresa-ID")
) -> str:
    emp_id = empresaId or x_empresa_id
    if not emp_id:
        raise ValidationError("empresaId não informado (query ou header)")
    return emp_id

@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def api_create_fornecedor(
    data: FornecedorCreate,
    user: UserContext = Depends(require_role("master", "adm", "estoque"))
):
    if "master" not in user.papeis and data.empresaId not in user.empresasIds:
        raise ForbiddenError("Você não tem acesso a esta empresa.")
        
    forn_data = data.model_dump(exclude_unset=True)
    forn_data["nome"] = sanitize_string(forn_data["nome"])
    
    if forn_data.get("cnpjCpf"):
        val = forn_data["cnpjCpf"]
        if len(val) > 14:
            forn_data["cnpjCpf"] = validate_cnpj(val)
        else:
            forn_data["cnpjCpf"] = validate_cpf(val)
            
    if forn_data.get("celular"):
        forn_data["celular"] = validate_phone(forn_data["celular"])
        
    forn_data["criadoEm"] = firestore.SERVER_TIMESTAMP
    forn_data["atualizadoEm"] = firestore.SERVER_TIMESTAMP
    forn_data["ativo"] = True
    
    doc_id = create_document(FORNECEDORES_COLLECTION, forn_data)
    log_action(doc_id, user.uid, "CREATE", "fornecedor", None, forn_data)
    
    return get_document(FORNECEDORES_COLLECTION, doc_id)

@router.get("/", response_model=List[Dict[str, Any]])
def api_list_fornecedores(
    empresa_id: str = Depends(get_empresa_id),
    user: UserContext = Depends(get_current_user)
):
    if "master" not in user.papeis and empresa_id not in user.empresasIds:
        raise ForbiddenError("Acesso negado.")
        
    return list_documents(FORNECEDORES_COLLECTION, filters=[("empresaId", "==", empresa_id), ("ativo", "==", True)])

@router.get("/{id}", response_model=Dict[str, Any])
def api_get_fornecedor(id: str, user: UserContext = Depends(get_current_user)):
    forn = get_document(FORNECEDORES_COLLECTION, id)
    if not forn:
        raise NotFoundError("Fornecedor não encontrado.")
        
    if "master" not in user.papeis and forn.get("empresaId") not in user.empresasIds:
        raise ForbiddenError("Acesso negado.")
        
    return forn

@router.put("/{id}", response_model=Dict[str, Any])
def api_update_fornecedor(
    id: str,
    data: FornecedorUpdate,
    user: UserContext = Depends(require_role("master", "adm", "estoque"))
):
    forn = get_document(FORNECEDORES_COLLECTION, id)
    if not forn:
        raise NotFoundError("Fornecedor não encontrado.")
        
    if "master" not in user.papeis and forn.get("empresaId") not in user.empresasIds:
        raise ForbiddenError("Acesso negado.")
        
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return forn
        
    if "nome" in update_data:
        update_data["nome"] = sanitize_string(update_data["nome"])
        
    update_data["atualizadoEm"] = firestore.SERVER_TIMESTAMP
    update_document(FORNECEDORES_COLLECTION, id, update_data)
    
    depois = get_document(FORNECEDORES_COLLECTION, id)
    log_action(id, user.uid, "UPDATE", "fornecedor", forn, depois)
    return depois

@router.delete("/{id}")
def api_delete_fornecedor(
    id: str,
    user: UserContext = Depends(require_role("master", "adm"))
):
    forn = get_document(FORNECEDORES_COLLECTION, id)
    if not forn:
        raise NotFoundError("Fornecedor não encontrado.")
        
    if "master" not in user.papeis and forn.get("empresaId") not in user.empresasIds:
        raise ForbiddenError("Acesso negado.")
        
    # Soft delete
    update_data = {"ativo": False, "atualizadoEm": firestore.SERVER_TIMESTAMP}
    update_document(FORNECEDORES_COLLECTION, id, update_data)
    
    depois = get_document(FORNECEDORES_COLLECTION, id)
    log_action(id, user.uid, "DELETE_SOFT", "fornecedor", forn, depois)
    
    return {"status": "ok", "message": "Fornecedor removido com sucesso."}
