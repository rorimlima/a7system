"""
Rotas para o módulo de Compras.
"""
from fastapi import APIRouter, Depends, Query, Path
from typing import List, Optional
from pydantic import BaseModel

from shared.auth_middleware import (
    UserContext,
    ensure_company_access,
    require_permission,
)
from .services import create_purchase, list_purchases, get_purchase

router = APIRouter()

class CompraItemRequest(BaseModel):
    produtoId: Optional[str] = None
    codigoFornecedor: Optional[str] = None
    descricao: str
    ncm: Optional[str] = None
    cfop: Optional[str] = None
    cst: Optional[str] = None
    quantidade: int
    valorUnitario: float
    desconto: float = 0
    fotos: Optional[List[str]] = None

class ParcelamentoRequest(BaseModel):
    numeroParcelas: int
    dataBase: str
    intervaloDias: int = 30
    valores: Optional[List[float]] = None

class CompraRequest(BaseModel):
    empresaId: str
    fornecedorId: str
    dataCompra: str
    numeroNota: Optional[str] = None
    itens: List[CompraItemRequest]
    condicaoPagamento: Optional[str] = None
    parcelamento: ParcelamentoRequest

@router.post("/", status_code=201)
def registrar_compra(
    request: CompraRequest,
    user: UserContext = Depends(require_permission("compras:criar"))
):
    """
    Registra uma compra completa transacionalmente:
    - Atualiza/Cria Produtos
    - Gera Movimentações de Entrada
    - Registra Compra
    - Gera parcelas em Contas a Pagar
    """
    empresa_id = ensure_company_access(user, request.empresaId)

    resultado = create_purchase(
        empresa_id=empresa_id,
        fornecedor_id=request.fornecedorId,
        data_compra=request.dataCompra,
        numero_nota=request.numeroNota,
        itens=[item.model_dump() for item in request.itens],
        parcelamento=request.parcelamento.model_dump(),
        user_id=user.uid
    )
    return {"message": "Compra registrada com sucesso", "data": resultado}


@router.get("/")
def listar_compras(
    fornecedorId: Optional[str] = Query(None),
    user: UserContext = Depends(require_permission("compras:ver"))
):
    """Lista as compras da empresa."""
    filters = {}
    if fornecedorId:
        filters["fornecedorId"] = fornecedorId
        
    resultado = list_purchases(ensure_company_access(user, None), filters)
    return {"data": resultado}


@router.get("/{id}")
def obter_compra(
    id: str = Path(...),
    user: UserContext = Depends(require_permission("compras:ver"))
):
    """Detalhes de uma compra."""
    resultado = get_purchase(ensure_company_access(user, None), id)
    return {"data": resultado}
