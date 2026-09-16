"""
Rotas para o módulo de Compras.
"""
from fastapi import APIRouter, Depends, Query, Path
from typing import List, Optional
from pydantic import BaseModel

from shared.auth_middleware import get_current_user, require_role, UserContext
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
    user: UserContext = Depends(require_role(["master", "adm", "estoque"]))
):
    """
    Registra uma compra completa transacionalmente:
    - Atualiza/Cria Produtos
    - Gera Movimentações de Entrada
    - Registra Compra
    - Gera parcelas em Contas a Pagar
    """
    # Validar se a empresaId no request bate com os claims (ou se a empresa do context resolve)
    # Supondo que a verificação de pertencimento a empresa seja baseada no empresa_ativa ou empresasIds
    if request.empresaId not in user.empresasIds:
        raise ValueError("Usuário não tem acesso a esta empresa.")
        
    resultado = create_purchase(
        empresa_id=request.empresaId,
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
    user: UserContext = Depends(require_role(["master", "adm", "estoque", "vendedor"]))
):
    """Lista as compras da empresa."""
    filters = {}
    if fornecedorId:
        filters["fornecedorId"] = fornecedorId
        
    resultado = list_purchases(user.empresa_ativa, filters)
    return {"data": resultado}


@router.get("/{id}")
def obter_compra(
    id: str = Path(...),
    user: UserContext = Depends(require_role(["master", "adm", "estoque", "vendedor"]))
):
    """Detalhes de uma compra."""
    resultado = get_purchase(user.empresa_ativa, id)
    return {"data": resultado}
