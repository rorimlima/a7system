from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import io

from shared.auth_middleware import (
    UserContext,
    ensure_company_access,
    require_permission,
)
from shared.firestore_client import get_db
from shared.errors import NotFoundError, ValidationError

from sales.services import (
    create_sale,
    list_sales,
    get_sale,
    create_recebimento,
    list_recebimentos,
    InsufficientStockError
)
from sales.recibo_pdf import generate_recibo_pdf

router = APIRouter()

class VendaItemRequest(BaseModel):
    produtoId: str
    descricao: str
    quantidade: int = Field(gt=0, description="Quantidade deve ser maior que zero")
    valorUnitario: float = Field(ge=0, description="Valor unitário não pode ser negativo")
    desconto: float = Field(default=0, ge=0, description="Desconto não pode ser negativo")

class VendaRequest(BaseModel):
    empresaId: str
    clienteId: str
    itens: List[VendaItemRequest]

class RecebimentoRequest(BaseModel):
    data: Optional[str] = None # YYYY-MM-DD
    forma: str
    observacoes: Optional[str] = ""
    valor: float = Field(gt=0)

@router.post("/")
def fechar_venda(
    request: VendaRequest,
    user: UserContext = Depends(require_permission("vendas:criar"))
):
    """
    Registra uma nova venda. 
    Verifica saldo, debita estoque transacionalmente e cria movimentações.
    """
    empresa_id = ensure_company_access(user, request.empresaId)
    
    if not request.itens:
        raise HTTPException(status_code=400, detail="A venda deve conter pelo menos um item.")
        
    itens_dict = [item.dict() for item in request.itens]
    
    try:
        nova_venda = create_sale(
            empresa_id=empresa_id,
            cliente_id=request.clienteId,
            itens=itens_dict,
            user_id=user.uid
        )
        return {"message": "Venda concluída com sucesso.", "venda": nova_venda}
        
    except InsufficientStockError as e:
        raise HTTPException(status_code=400, detail={"message": str(e), "details": e.details})
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/")
def listar_vendas(
    empresaId: str,
    dataInicio: Optional[str] = Query(None),
    dataFim: Optional[str] = Query(None),
    clienteId: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: UserContext = Depends(require_permission("vendas:ver"))
):
    """Lista as vendas da empresa."""
    ensure_company_access(user, empresaId)
    
    vendas = list_sales(empresaId, dataInicio, dataFim, clienteId, status)
    return vendas

@router.get("/{id}")
def detalhe_venda(
    id: str,
    empresaId: str,
    user: UserContext = Depends(require_permission("vendas:ver"))
):
    """Detalhes de uma venda específica."""
    ensure_company_access(user, empresaId)
    
    try:
        venda = get_sale(empresaId, id)
        return venda
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{id}/recebimento")
def registrar_recebimento(
    id: str,
    request: RecebimentoRequest,
    empresaId: str = Query(...),
    user: UserContext = Depends(require_permission("recebimentos:criar"))
):
    """Registra um recebimento para a venda."""
    ensure_company_access(user, empresaId)
    
    try:
        rec = create_recebimento(
            empresa_id=empresaId,
            venda_id=id,
            data=request.data,
            forma=request.forma,
            observacoes=request.observacoes,
            valor=request.valor,
            user_id=user.uid
        )
        return {"message": "Recebimento registrado com sucesso.", "recebimento": rec}
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao registrar recebimento: {str(e)}")

@router.get("/{id}/recebimentos")
def listar_recebimentos_venda(
    id: str,
    empresaId: str = Query(...),
    user: UserContext = Depends(require_permission("recebimentos:ver"))
):
    """Lista todos os recebimentos de uma venda."""
    ensure_company_access(user, empresaId)
    
    try:
        recs = list_recebimentos(empresaId, id)
        return recs
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{id}/recibo")
def gerar_recibo_pdf(
    id: str,
    empresaId: str = Query(...),
    user: UserContext = Depends(require_permission("vendas:ver"))
):
    """Gera o recibo da venda em PDF."""
    ensure_company_access(user, empresaId)
    
    try:
        db = get_db()
        venda = get_sale(empresaId, id)
        
        # Buscar dados da empresa
        empresa_doc = db.collection('empresas').document(empresaId).get()
        empresa_data = empresa_doc.to_dict() if empresa_doc.exists else {}
        
        # Buscar dados do cliente
        cliente_id = venda.get('clienteId')
        cliente_data = {}
        if cliente_id:
            cliente_doc = db.collection('clientes').document(cliente_id).get()
            if cliente_doc.exists:
                cliente_data = cliente_doc.to_dict()
                
        # Buscar recebimentos
        recebimentos = list_recebimentos(empresaId, id)
        
        pdf_bytes = generate_recibo_pdf(venda, empresa_data, cliente_data, recebimentos)
        
        headers = {
            'Content-Disposition': f'inline; filename="recibo_{venda.get("numeroPedido", id)}.pdf"'
        }
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers=headers
        )
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {str(e)}")
