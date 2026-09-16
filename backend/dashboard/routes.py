from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import io
import datetime

from auth.auth_middleware import get_current_user_with_roles
from shared.firestore_client import get_db

from dashboard.services import (
    get_kpis,
    get_sales_by_day,
    get_top_products,
    get_cash_flow
)
from dashboard.dashboard_pdf import generate_dashboard_pdf

router = APIRouter()

@router.get("/kpis")
def kpis(
    empresaId: str,
    dataInicial: Optional[str] = Query(None),
    dataFinal: Optional[str] = Query(None),
    user: dict = Depends(get_current_user_with_roles(["master", "adm"]))
):
    """Retorna os principais KPIs do dashboard financeiro."""
    if empresaId not in user.get('empresasIds', []):
        raise HTTPException(status_code=403, detail="Sem acesso a esta empresa.")
        
    return get_kpis(empresaId, dataInicial, dataFinal)

@router.get("/vendas-por-dia")
def vendas_por_dia(
    empresaId: str,
    dataInicial: Optional[str] = Query(None),
    dataFinal: Optional[str] = Query(None),
    user: dict = Depends(get_current_user_with_roles(["master", "adm"]))
):
    """Retorna os dados para gráfico de vendas diárias no período."""
    if empresaId not in user.get('empresasIds', []):
        raise HTTPException(status_code=403, detail="Sem acesso a esta empresa.")
        
    return get_sales_by_day(empresaId, dataInicial, dataFinal)

@router.get("/top-produtos")
def top_produtos(
    empresaId: str,
    limit: int = Query(10, ge=1, le=50),
    user: dict = Depends(get_current_user_with_roles(["master", "adm"]))
):
    """Retorna os produtos mais vendidos."""
    if empresaId not in user.get('empresasIds', []):
        raise HTTPException(status_code=403, detail="Sem acesso a esta empresa.")
        
    return get_top_products(empresaId, limit)

@router.get("/fluxo-caixa")
def fluxo_caixa(
    empresaId: str,
    meses: int = Query(6, ge=1, le=12),
    user: dict = Depends(get_current_user_with_roles(["master", "adm"]))
):
    """Retorna o fluxo de caixa (entradas vs saídas) mensal."""
    if empresaId not in user.get('empresasIds', []):
        raise HTTPException(status_code=403, detail="Sem acesso a esta empresa.")
        
    return get_cash_flow(empresaId, meses)

@router.get("/export-pdf")
def export_pdf(
    empresaId: str,
    dataInicial: Optional[str] = Query(None),
    dataFinal: Optional[str] = Query(None),
    user: dict = Depends(get_current_user_with_roles(["master", "adm"]))
):
    """Gera PDF do dashboard financeiro."""
    if empresaId not in user.get('empresasIds', []):
        raise HTTPException(status_code=403, detail="Sem acesso a esta empresa.")
        
    try:
        db = get_db()
        
        # Obter dados da empresa
        empresa_doc = db.collection('empresas').document(empresaId).get()
        empresa_data = empresa_doc.to_dict() if empresa_doc.exists else {}
        
        # Buscar dados do dashboard
        kpis_data = get_kpis(empresaId, dataInicial, dataFinal)
        top_produtos_data = get_top_products(empresaId, 10)
        
        # Resumo de contas
        contas_resumo = {
            'em_aberto': kpis_data.get('contas_pagar_aberto', 0),
            'atrasadas': kpis_data.get('contas_pagar_atrasadas', 0)
        }
        
        periodo = f"{dataInicial} até {dataFinal}" if dataInicial and dataFinal else "Todo o período"
        
        pdf_bytes = generate_dashboard_pdf(empresa_data, kpis_data, top_produtos_data, contas_resumo, periodo)
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        headers = {
            'Content-Disposition': f'attachment; filename="dashboard_{timestamp}.pdf"'
        }
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers=headers
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {str(e)}")
