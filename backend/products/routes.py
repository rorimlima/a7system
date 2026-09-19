from fastapi import APIRouter, Depends, Query, Header, UploadFile, File, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from shared.auth_middleware import (
    UserContext,
    ensure_company_access,
    require_permission,
)
from shared.validators import sanitize_string
from shared.errors import NotFoundError, ForbiddenError, ValidationError

from products.services import (
    create_product,
    update_product,
    get_product,
    list_products,
    list_low_stock_products,
    upload_product_photo
)

router = APIRouter()

class ProdutoCreate(BaseModel):
    empresaId: str
    codigoFornecedor: Optional[str] = None
    descricao: str = Field(..., min_length=2)
    ncm: Optional[str] = None
    cfop: Optional[str] = None
    cst: Optional[str] = None
    quantidadeAtual: float = 0.0
    quantidadeMinima: float = 0.0
    valorUnitario: float = 0.0
    desconto: float = 0.0
    valorTotal: float = 0.0

class ProdutoUpdate(BaseModel):
    codigoFornecedor: Optional[str] = None
    descricao: Optional[str] = None
    ncm: Optional[str] = None
    cfop: Optional[str] = None
    cst: Optional[str] = None
    quantidadeAtual: Optional[float] = None
    quantidadeMinima: Optional[float] = None
    valorUnitario: Optional[float] = None
    desconto: Optional[float] = None
    valorTotal: Optional[float] = None

def get_empresa_id(
    empresaId: Optional[str] = Query(None), 
    x_empresa_id: Optional[str] = Header(None, alias="X-Empresa-ID")
) -> str:
    emp_id = empresaId or x_empresa_id
    if not emp_id:
        raise ValidationError("empresaId não informado (query ou header)")
    return emp_id

@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def api_create_product(
    data: ProdutoCreate,
    user: UserContext = Depends(require_permission("produtos:criar"))
):
    ensure_company_access(user, data.empresaId)
        
    prod_data = data.model_dump(exclude_unset=True)
    prod_data["descricao"] = sanitize_string(prod_data["descricao"])
    
    return create_product(prod_data, user.uid)

@router.get("/", response_model=List[Dict[str, Any]])
def api_list_products(
    search: Optional[str] = None,
    # skip: int = 0, limit: int = 50, # Paginacao manual pode ser feita aqui
    empresa_id: str = Depends(get_empresa_id),
    user: UserContext = Depends(require_permission("produtos:ver"))
):
    ensure_company_access(user, empresa_id)
        
    return list_products(empresa_id, search)

@router.get("/low-stock", response_model=List[Dict[str, Any]])
def api_low_stock(
    empresa_id: str = Depends(get_empresa_id),
    user: UserContext = Depends(require_permission("produtos:ver"))
):
    ensure_company_access(user, empresa_id)
        
    return list_low_stock_products(empresa_id)

@router.get("/{id}", response_model=Dict[str, Any])
def api_get_product(id: str, user: UserContext = Depends(require_permission("produtos:ver"))):
    prod = get_product(id)
    if not prod:
        raise NotFoundError("Produto não encontrado.")
        
    ensure_company_access(user, prod.get("empresaId"))
        
    return prod

@router.put("/{id}", response_model=Dict[str, Any])
def api_update_product(
    id: str,
    data: ProdutoUpdate,
    user: UserContext = Depends(require_permission("produtos:editar"))
):
    prod = get_product(id)
    if not prod:
        raise NotFoundError("Produto não encontrado.")
        
    ensure_company_access(user, prod.get("empresaId"))
        
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return prod
        
    if "descricao" in update_data:
        update_data["descricao"] = sanitize_string(update_data["descricao"])
        
    return update_product(id, update_data, user.uid)

@router.post("/{id}/fotos")
async def api_upload_photo(
    id: str,
    file: UploadFile = File(...),
    user: UserContext = Depends(require_permission("produtos:editar"))
):
    prod = get_product(id)
    if not prod:
        raise NotFoundError("Produto não encontrado.")
        
    empresa_id = prod.get("empresaId")
    ensure_company_access(user, empresa_id)
        
    ext = file.filename.split(".")[-1]
    if ext.lower() not in ["jpg", "jpeg", "png"]:
        raise ValidationError("Formato de imagem inválido. Use JPG ou PNG.")
        
    contents = await file.read()
    url = upload_product_photo(id, empresa_id, contents, ext, user.uid)
    return {"url": url}
