from fastapi import APIRouter, Depends, Query, Header, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from shared.auth_middleware import get_current_user, require_role, UserContext
from shared.validators import sanitize_string, validate_cnpj, validate_cpf
from shared.errors import NotFoundError, ForbiddenError, ValidationError, ConflictError
from shared.firestore_client import create_document, update_document, get_document, list_documents
from shared.audit import log_action

router = APIRouter()
CLIENTES_COLLECTION = "clientes"
VENDAS_COLLECTION = "vendas"

class ClienteCreate(BaseModel):
    empresaId: str
    nome: str = Field(..., min_length=2)
    cpfCnpj: str
    enderecoCompleto: str
    contatos: Optional[str] = None
    regiao: Optional[str] = None
    cidade: Optional[str] = None
    bairro: Optional[str] = None

class ClienteUpdate(BaseModel):
    nome: Optional[str] = None
    cpfCnpj: Optional[str] = None
    enderecoCompleto: Optional[str] = None
    contatos: Optional[str] = None
    regiao: Optional[str] = None
    cidade: Optional[str] = None
    bairro: Optional[str] = None
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
def api_create_cliente(
    data: ClienteCreate,
    user: UserContext = Depends(require_role("master", "adm", "vendedor"))
):
    if "master" not in user.papeis and data.empresaId not in user.empresasIds:
        raise ForbiddenError("Você não tem acesso a esta empresa.")
        
    cli_data = data.model_dump(exclude_unset=True)
    cli_data["nome"] = sanitize_string(cli_data["nome"])
    
    val = cli_data["cpfCnpj"]
    if len(val) > 14:
        cli_data["cpfCnpj"] = validate_cnpj(val)
    else:
        cli_data["cpfCnpj"] = validate_cpf(val)
            
    cli_data["criadoEm"] = datetime.now(timezone.utc).isoformat()
    cli_data["atualizadoEm"] = datetime.now(timezone.utc).isoformat()
    cli_data["ativo"] = True
    
    doc_id = create_document(CLIENTES_COLLECTION, cli_data)
    log_action(doc_id, user.uid, "CREATE", "cliente", None, cli_data)
    
    return get_document(CLIENTES_COLLECTION, doc_id)

@router.get("/", response_model=List[Dict[str, Any]])
def api_list_clientes(
    empresa_id: str = Depends(get_empresa_id),
    user: UserContext = Depends(get_current_user)
):
    if "master" not in user.papeis and empresa_id not in user.empresasIds:
        raise ForbiddenError("Acesso negado.")
        
    return list_documents(CLIENTES_COLLECTION, filters=[("empresaId", "==", empresa_id), ("ativo", "==", True)])

@router.get("/{id}", response_model=Dict[str, Any])
def api_get_cliente(id: str, user: UserContext = Depends(get_current_user)):
    cli = get_document(CLIENTES_COLLECTION, id)
    if not cli:
        raise NotFoundError("Cliente não encontrado.")
        
    if "master" not in user.papeis and cli.get("empresaId") not in user.empresasIds:
        raise ForbiddenError("Acesso negado.")
        
    # TODO: add historico if required
    return cli

@router.put("/{id}", response_model=Dict[str, Any])
def api_update_cliente(
    id: str,
    data: ClienteUpdate,
    user: UserContext = Depends(require_role("master", "adm", "vendedor"))
):
    cli = get_document(CLIENTES_COLLECTION, id)
    if not cli:
        raise NotFoundError("Cliente não encontrado.")
        
    if "master" not in user.papeis and cli.get("empresaId") not in user.empresasIds:
        raise ForbiddenError("Acesso negado.")
        
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return cli
        
    if "nome" in update_data:
        update_data["nome"] = sanitize_string(update_data["nome"])
        
    update_data["atualizadoEm"] = datetime.now(timezone.utc).isoformat()
    update_document(CLIENTES_COLLECTION, id, update_data)
    
    depois = get_document(CLIENTES_COLLECTION, id)
    log_action(id, user.uid, "UPDATE", "cliente", cli, depois)
    return depois

@router.delete("/{id}")
def api_delete_cliente(
    id: str,
    user: UserContext = Depends(require_role("master", "adm"))
):
    cli = get_document(CLIENTES_COLLECTION, id)
    if not cli:
        raise NotFoundError("Cliente não encontrado.")
        
    if "master" not in user.papeis and cli.get("empresaId") not in user.empresasIds:
        raise ForbiddenError("Acesso negado.")
        
    # check for vendas
    vendas = list_documents(VENDAS_COLLECTION, filters=[("clienteId", "==", id)], limit=1)
    if vendas:
        raise ConflictError("Não é possível excluir um cliente que possui vendas.")
        
    # Soft delete
    update_data = {"ativo": False, "atualizadoEm": datetime.now(timezone.utc).isoformat()}
    update_document(CLIENTES_COLLECTION, id, update_data)
    
    depois = get_document(CLIENTES_COLLECTION, id)
    log_action(id, user.uid, "DELETE_SOFT", "cliente", cli, depois)
    
    return {"status": "ok", "message": "Cliente removido com sucesso."}
