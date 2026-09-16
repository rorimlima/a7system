from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

from shared.auth_middleware import require_roles
from shared.errors import ValidationError
from products.estoque_services import (
    register_saida,
    register_devolucao,
    list_movimentacoes,
    list_devolucoes,
    get_low_stock_products
)

router = APIRouter()

# Models para as requisições

class SaidaRequest(BaseModel):
    empresaId: str = Field(..., description="ID da empresa")
    produtoId: str = Field(..., description="ID do produto")
    quantidade: float = Field(..., gt=0, description="Quantidade a ser dada baixa")
    tipo: str = Field(..., description="'saida' ou 'ajuste'")
    motivo: str = Field(..., description="Motivo da saída/ajuste")
    observacoes: Optional[str] = None

class ItemDevolucao(BaseModel):
    produtoId: str
    descricao: str
    quantidade: float = Field(..., gt=0)
    valorUnitario: float = Field(..., ge=0)

class DevolucaoRequest(BaseModel):
    empresaId: str
    fornecedorId: str
    compraId: Optional[str] = None
    data: date
    motivo: str
    itens: List[ItemDevolucao]
    retornoFinanceiro: bool
    ajusteContaPagarId: Optional[str] = None


@router.post("/saida", summary="Registrar saída manual ou ajuste")
def create_saida(request: SaidaRequest, req: dict = Depends(require_roles(["master", "adm", "estoque"]))):
    """
    Registra uma saída (perda, quebra) ou ajuste manual de estoque.
    Valida se há quantidade suficiente antes de debitar.
    """
    user_id = req["user"]["uid"]
    empresa_id = request.empresaId
    
    # Validar se o usuário pertence à empresa
    user_empresas = req["user"].get("empresasIds", [])
    if "master" not in req["user"].get("papeis", []) and empresa_id not in user_empresas:
        raise ValidationError("Usuário não tem acesso a esta empresa")
        
    result = register_saida(
        empresa_id=empresa_id,
        produto_id=request.produtoId,
        quantidade=request.quantidade,
        tipo=request.tipo,
        motivo=request.motivo,
        observacoes=request.observacoes,
        user_id=user_id
    )
    return {"success": True, "data": result}


@router.post("/devolucao", summary="Registrar devolução ao fornecedor")
def create_devolucao(request: DevolucaoRequest, req: dict = Depends(require_roles(["master", "adm", "estoque"]))):
    """
    Registra devolução de produtos.
    Debita o estoque, cria movimentação, gera documento de devolução e opcionalmente ajusta o financeiro.
    """
    user_id = req["user"]["uid"]
    empresa_id = request.empresaId
    
    user_empresas = req["user"].get("empresasIds", [])
    if "master" not in req["user"].get("papeis", []) and empresa_id not in user_empresas:
        raise ValidationError("Usuário não tem acesso a esta empresa")
        
    itens_dict = [item.dict() for item in request.itens]
    
    result = register_devolucao(
        empresa_id=empresa_id,
        fornecedor_id=request.fornecedorId,
        compra_id=request.compraId,
        data=request.data.isoformat(),
        motivo=request.motivo,
        itens=itens_dict,
        retorno_financeiro=request.retornoFinanceiro,
        ajuste_conta_pagar_id=request.ajusteContaPagarId,
        user_id=user_id
    )
    return {"success": True, "data": result}


@router.get("/movimentacoes", summary="Histórico de movimentações")
def get_movimentacoes(
    empresaId: str,
    produtoId: Optional[str] = None,
    tipo: Optional[str] = None,
    dataInicial: Optional[str] = None,
    dataFinal: Optional[str] = None,
    req: dict = Depends(require_roles(["master", "adm", "vendedor", "estoque"]))
):
    """Lista as movimentações de estoque, ordenadas pela mais recente."""
    user_empresas = req["user"].get("empresasIds", [])
    if "master" not in req["user"].get("papeis", []) and empresaId not in user_empresas:
        raise ValidationError("Usuário não tem acesso a esta empresa")
        
    movimentacoes = list_movimentacoes(empresaId, produtoId, tipo, dataInicial, dataFinal)
    return {"success": True, "data": movimentacoes}


@router.get("/devolucoes", summary="Lista de devoluções")
def get_devolucoes(
    empresaId: str,
    req: dict = Depends(require_roles(["master", "adm", "estoque"]))
):
    """Lista todas as devoluções feitas ao fornecedor pela empresa."""
    user_empresas = req["user"].get("empresasIds", [])
    if "master" not in req["user"].get("papeis", []) and empresaId not in user_empresas:
        raise ValidationError("Usuário não tem acesso a esta empresa")
        
    devolucoes = list_devolucoes(empresaId)
    return {"success": True, "data": devolucoes}


@router.get("/alertas", summary="Produtos abaixo do estoque mínimo")
def get_alertas_estoque(
    empresaId: str,
    req: dict = Depends(require_roles(["master", "adm", "estoque"]))
):
    """Retorna produtos cujo estoque atual está abaixo do estoque mínimo."""
    user_empresas = req["user"].get("empresasIds", [])
    if "master" not in req["user"].get("papeis", []) and empresaId not in user_empresas:
        raise ValidationError("Usuário não tem acesso a esta empresa")
        
    alertas = get_low_stock_products(empresaId)
    return {"success": True, "data": alertas}
