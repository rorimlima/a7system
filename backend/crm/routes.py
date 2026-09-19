"""
Rotas do módulo de CRM.
"""
from fastapi import APIRouter, Depends
from typing import List, Dict, Any

from shared.auth_middleware import (
    UserContext,
    ensure_company_access,
    require_permission,
)
from crm.services import (
    get_top_clients,
    get_client_history,
    get_clients_by_region,
    get_inactive_clients,
    get_crm_metrics
)

router = APIRouter()

# Permissão exigida por todo o módulo de CRM
CRM_VER = "crm:ver"

@router.get("/clientes-ranking")
async def api_get_top_clients(
    limit: int = 20,
    user: UserContext = Depends(require_permission(CRM_VER))
):
    """Retorna o ranking dos top clientes por valor total comprado."""
    empresa_id = ensure_company_access(user, None)
    return get_top_clients(empresa_id, limit)

@router.get("/clientes/{cliente_id}/historico")
async def api_get_client_history(
    cliente_id: str,
    user: UserContext = Depends(require_permission(CRM_VER))
):
    """Retorna o histórico completo do cliente (vendas, recebimentos, métricas)."""
    empresa_id = ensure_company_access(user, None)
    return get_client_history(empresa_id, cliente_id)

@router.get("/clientes/por-regiao")
async def api_get_clients_by_region(
    user: UserContext = Depends(require_permission(CRM_VER))
):
    """Retorna a distribuição de clientes por região."""
    empresa_id = ensure_company_access(user, None)
    return get_clients_by_region(empresa_id)

@router.get("/clientes/inativos")
async def api_get_inactive_clients(
    dias: int = 90,
    user: UserContext = Depends(require_permission(CRM_VER))
):
    """Retorna a lista de clientes sem compras há mais de N dias."""
    empresa_id = ensure_company_access(user, None)
    return get_inactive_clients(empresa_id, dias)

@router.get("/metricas")
async def api_get_crm_metrics(
    user: UserContext = Depends(require_permission(CRM_VER))
):
    """Retorna métricas gerais de CRM (total, novos, ticket médio, taxa de retorno)."""
    empresa_id = ensure_company_access(user, None)
    return get_crm_metrics(empresa_id)
