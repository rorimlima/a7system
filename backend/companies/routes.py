from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from shared.auth_middleware import get_current_user, require_role, UserContext
from shared.validators import sanitize_string, validate_cnpj
from shared.errors import NotFoundError, ForbiddenError, ValidationError

from companies.services import (
    create_company,
    update_company,
    get_company,
    list_companies,
    upload_company_logo
)

router = APIRouter()

class TemaModel(BaseModel):
    corPrimaria: Optional[str] = "#DC2626"
    corSecundaria: Optional[str] = "#B91C1C"

class EmpresaCreate(BaseModel):
    nome: str = Field(..., min_length=2)
    cnpj: str
    tema: Optional[TemaModel] = TemaModel()
    visivelNaLanding: Optional[bool] = False

class EmpresaUpdate(BaseModel):
    nome: Optional[str] = None
    tema: Optional[TemaModel] = None
    visivelNaLanding: Optional[bool] = None

@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def api_create_company(
    empresa: EmpresaCreate, 
    user: UserContext = Depends(require_role("master"))
):
    """Cria uma nova empresa. Restrito a master."""
    cnpj_limpo = validate_cnpj(empresa.cnpj)
    
    data = empresa.model_dump(exclude_unset=True)
    data["nome"] = sanitize_string(data["nome"])
    data["cnpj"] = cnpj_limpo
    
    return create_company(data, user.uid)

@router.get("/", response_model=List[Dict[str, Any]])
def api_list_companies(user: UserContext = Depends(get_current_user)):
    """Lista as empresas as quais o usuário tem acesso."""
    if "master" in user.papeis:
        # TODO: Para master, poderia listar todas. Por hora, listamos as do claims.
        pass
    
    if not user.empresasIds:
        return []
    
    return list_companies(user.empresasIds)

@router.get("/{id}", response_model=Dict[str, Any])
def api_get_company(id: str, user: UserContext = Depends(get_current_user)):
    """Detalhes da empresa (Anti-IDOR: empresa deve estar nos claims ou ser master)."""
    if "master" not in user.papeis and id not in user.empresasIds:
        raise ForbiddenError("Acesso negado a esta empresa.")
        
    empresa = get_company(id)
    if not empresa:
        raise NotFoundError("Empresa não encontrada.")
    return empresa

@router.put("/{id}", response_model=Dict[str, Any])
def api_update_company(
    id: str, 
    empresa: EmpresaUpdate, 
    user: UserContext = Depends(require_role("master", "adm"))
):
    """Atualiza dados da empresa."""
    if "master" not in user.papeis and id not in user.empresasIds:
        raise ForbiddenError("Acesso negado.")
        
    data = empresa.model_dump(exclude_unset=True)
    if "nome" in data and data["nome"]:
        data["nome"] = sanitize_string(data["nome"])
        
    return update_company(id, data, user.uid)

@router.patch("/{id}/visibility", response_model=Dict[str, Any])
def api_update_visibility(
    id: str, 
    visivelNaLanding: bool,
    user: UserContext = Depends(require_role("master"))
):
    """Atualiza visibilidade da empresa na landing page. Restrito a master."""
    return update_company(id, {"visivelNaLanding": visivelNaLanding}, user.uid)

@router.post("/{id}/logo")
async def api_upload_logo(
    id: str, 
    file: UploadFile = File(...), 
    user: UserContext = Depends(require_role("master", "adm"))
):
    """Faz upload do logo da empresa."""
    if "master" not in user.papeis and id not in user.empresasIds:
        raise ForbiddenError("Acesso negado.")
        
    ext = file.filename.split(".")[-1]
    if ext.lower() not in ["jpg", "jpeg", "png"]:
        raise ValidationError("Formato de imagem inválido. Use JPG ou PNG.")
        
    contents = await file.read()
    logo_url = upload_company_logo(id, contents, ext, user.uid)
    return {"logoUrl": logo_url}
