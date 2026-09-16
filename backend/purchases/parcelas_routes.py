"""
Rotas para Contas a Pagar e Parcelas.
"""
from fastapi import APIRouter, Depends, Query, Path
from typing import List, Optional
from pydantic import BaseModel

from shared.auth_middleware import get_current_user, require_role, UserContext
from .parcelas_services import (
    list_contas_a_pagar,
    get_conta_a_pagar,
    get_parcelas_vencendo,
    get_parcelas_atrasadas,
    baixa_parcela
)

router = APIRouter()

class BaixaParcelaRequest(BaseModel):
    formaPagamento: str
    jurosMulta: float = 0.0
    observacoes: Optional[str] = None

@router.get("/")
def listar_contas(
    status: Optional[str] = Query(None),
    fornecedorId: Optional[str] = Query(None),
    user: UserContext = Depends(require_role(["master", "adm"]))
):
    """Lista contas a pagar."""
    resultado = list_contas_a_pagar(user.empresa_ativa, status, fornecedorId)
    return {"data": resultado}

@router.get("/vencendo")
def listar_vencendo(
    dias: int = Query(30),
    user: UserContext = Depends(require_role(["master", "adm"]))
):
    """Lista contas a pagar com parcelas vencendo nos próximos X dias."""
    resultado = get_parcelas_vencendo(user.empresa_ativa, dias)
    return {"data": resultado}

@router.get("/atrasadas")
def listar_atrasadas(
    user: UserContext = Depends(require_role(["master", "adm"]))
):
    """Lista contas a pagar com parcelas atrasadas e auto-atualiza status."""
    resultado = get_parcelas_atrasadas(user.empresa_ativa)
    return {"data": resultado}

@router.get("/{contaId}")
def obter_conta(
    contaId: str = Path(...),
    user: UserContext = Depends(require_role(["master", "adm"]))
):
    """Detalhe de uma conta a pagar e suas parcelas."""
    resultado = get_conta_a_pagar(user.empresa_ativa, contaId)
    return {"data": resultado}

@router.post("/{contaId}/baixa/{parcelaNum}")
def realizar_baixa_parcela(
    request: BaixaParcelaRequest,
    contaId: str = Path(...),
    parcelaNum: int = Path(...),
    user: UserContext = Depends(require_role(["master", "adm"]))
):
    """Baixa individual de uma parcela e recalculo da conta."""
    resultado = baixa_parcela(
        empresa_id=user.empresa_ativa,
        conta_id=contaId,
        parcela_num=parcelaNum,
        forma_pagamento=request.formaPagamento,
        juros_multa=request.jurosMulta,
        observacoes=request.observacoes,
        user_id=user.uid
    )
    return {"message": "Parcela baixada com sucesso", "data": resultado}
