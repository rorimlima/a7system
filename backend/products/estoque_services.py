import datetime
import uuid
from typing import Dict, Any, List, Optional
from firebase_admin import firestore
from shared.firestore_client import get_firestore_client
from shared.errors import NotFoundError, InsufficientStockError, ValidationError
from shared.audit import create_audit_log

def register_saida(empresa_id: str, produto_id: str, quantidade: float, tipo: str, motivo: str, observacoes: Optional[str], user_id: str) -> Dict[str, Any]:
    """
    Registra uma saída manual (perda, quebra, ajuste) de estoque de forma transacional.
    """
    if tipo not in ["saida", "ajuste"]:
        raise ValidationError("Tipo deve ser 'saida' ou 'ajuste'")
    if quantidade <= 0:
        raise ValidationError("Quantidade deve ser maior que zero")

    db = get_firestore_client()
    transaction = db.transaction()
    produto_ref = db.collection("produtos").document(produto_id)
    movimentacao_ref = db.collection("movimentacoes").document()

    @firestore.transactional
    def execute_saida(transaction, produto_ref, movimentacao_ref):
        snapshot = produto_ref.get(transaction=transaction)
        if not snapshot.exists:
            raise NotFoundError(f"Produto {produto_id} não encontrado")
        
        produto_data = snapshot.to_dict()
        if produto_data.get("empresaId") != empresa_id:
            raise NotFoundError("Produto não pertence à empresa")
            
        estoque_atual = produto_data.get("quantidadeAtual", 0)
        if estoque_atual < quantidade:
            raise InsufficientStockError(f"Estoque insuficiente. Atual: {estoque_atual}, Requerido: {quantidade}")
            
        novo_estoque = estoque_atual - quantidade
        
        # Atualizar produto
        transaction.update(produto_ref, {
            "quantidadeAtual": novo_estoque,
            "atualizadoEm": firestore.SERVER_TIMESTAMP
        })
        
        # Criar movimentação
        movimentacao_data = {
            "id": movimentacao_ref.id,
            "empresaId": empresa_id,
            "produtoId": produto_id,
            "tipo": tipo,
            "quantidade": quantidade,
            "motivo": motivo,
            "observacoes": observacoes,
            "criadoPor": user_id,
            "criadoEm": firestore.SERVER_TIMESTAMP,
            "estoqueAnterior": estoque_atual,
            "estoqueNovo": novo_estoque
        }
        transaction.set(movimentacao_ref, movimentacao_data)
        
        # Criar auditoria
        audit_ref = db.collection("audit_logs").document()
        audit_data = {
            "id": audit_ref.id,
            "empresaId": empresa_id,
            "userId": user_id,
            "action": f"ESTOQUE_{tipo.upper()}",
            "resource": "produtos",
            "resourceId": produto_id,
            "details": movimentacao_data,
            "timestamp": firestore.SERVER_TIMESTAMP
        }
        transaction.set(audit_ref, audit_data)
        
        return movimentacao_data

    result = execute_saida(transaction, produto_ref, movimentacao_ref)
    return result


def register_devolucao(
    empresa_id: str, 
    fornecedor_id: str, 
    compra_id: Optional[str], 
    data: str, 
    motivo: str, 
    itens: List[Dict[str, Any]], 
    retorno_financeiro: bool, 
    ajuste_conta_pagar_id: Optional[str], 
    user_id: str
) -> Dict[str, Any]:
    """
    Registra uma devolução ao fornecedor de forma transacional.
    """
    if not itens:
        raise ValidationError("A devolução deve conter pelo menos um item")

    db = get_firestore_client()
    transaction = db.transaction()
    
    devolucao_ref = db.collection("devolucoes").document()
    
    # Preparar referências para os produtos
    produtos_refs = {item["produtoId"]: db.collection("produtos").document(item["produtoId"]) for item in itens}
    conta_pagar_ref = db.collection("contasAPagar").document(ajuste_conta_pagar_id) if ajuste_conta_pagar_id else None

    @firestore.transactional
    def execute_devolucao(transaction):
        # 1. Validar e decrementar cada produto
        valor_total_devolucao = 0
        movimentacoes_para_criar = []
        
        for item in itens:
            produto_id = item["produtoId"]
            quantidade = item["quantidade"]
            valor_unitario = item["valorUnitario"]
            
            if quantidade <= 0:
                raise ValidationError(f"Quantidade inválida para o produto {produto_id}")
                
            p_ref = produtos_refs[produto_id]
            snapshot = p_ref.get(transaction=transaction)
            
            if not snapshot.exists:
                raise NotFoundError(f"Produto {produto_id} não encontrado")
                
            produto_data = snapshot.to_dict()
            if produto_data.get("empresaId") != empresa_id:
                raise NotFoundError(f"Produto {produto_id} não pertence à empresa")
                
            estoque_atual = produto_data.get("quantidadeAtual", 0)
            if estoque_atual < quantidade:
                raise InsufficientStockError(f"Estoque insuficiente no produto {produto_id}. Atual: {estoque_atual}, Requerido: {quantidade}")
                
            novo_estoque = estoque_atual - quantidade
            
            transaction.update(p_ref, {
                "quantidadeAtual": novo_estoque,
                "atualizadoEm": firestore.SERVER_TIMESTAMP
            })
            
            # Preparar movimentação
            mov_ref = db.collection("movimentacoes").document()
            mov_data = {
                "id": mov_ref.id,
                "empresaId": empresa_id,
                "produtoId": produto_id,
                "tipo": "devolucao",
                "quantidade": quantidade,
                "valorUnitario": valor_unitario,
                "motivo": motivo,
                "devolucaoId": devolucao_ref.id,
                "criadoPor": user_id,
                "criadoEm": firestore.SERVER_TIMESTAMP,
                "estoqueAnterior": estoque_atual,
                "estoqueNovo": novo_estoque
            }
            movimentacoes_para_criar.append((mov_ref, mov_data))
            
            valor_total_devolucao += (quantidade * valor_unitario)
            
        # 2. Financeiro
        if retorno_financeiro and conta_pagar_ref:
            conta_snap = conta_pagar_ref.get(transaction=transaction)
            if not conta_snap.exists:
                raise NotFoundError("Conta a pagar especificada não encontrada")
                
            conta_data = conta_snap.to_dict()
            if conta_data.get("empresaId") != empresa_id:
                raise NotFoundError("Conta a pagar não pertence à empresa")
                
            em_aberto_atual = conta_data.get("valorEmAberto", 0)
            novo_em_aberto = max(0, em_aberto_atual - valor_total_devolucao)
            
            transaction.update(conta_pagar_ref, {
                "valorEmAberto": novo_em_aberto,
                "atualizadoEm": firestore.SERVER_TIMESTAMP,
                "observacoes": f"{conta_data.get('observacoes', '')}\nAbatimento via devolução {devolucao_ref.id}.".strip()
            })
            
        # 3. Criar documento de devolução
        devolucao_data = {
            "id": devolucao_ref.id,
            "empresaId": empresa_id,
            "fornecedorId": fornecedor_id,
            "compraId": compra_id,
            "data": data,
            "motivo": motivo,
            "itens": itens,
            "valorTotal": valor_total_devolucao,
            "retornoFinanceiro": retorno_financeiro,
            "ajusteContaPagarId": ajuste_conta_pagar_id,
            "criadoPor": user_id,
            "criadoEm": firestore.SERVER_TIMESTAMP
        }
        transaction.set(devolucao_ref, devolucao_data)
        
        # Inserir movimentações
        for m_ref, m_data in movimentacoes_para_criar:
            transaction.set(m_ref, m_data)
            
        # Auditoria
        audit_ref = db.collection("audit_logs").document()
        audit_data = {
            "id": audit_ref.id,
            "empresaId": empresa_id,
            "userId": user_id,
            "action": "ESTOQUE_DEVOLUCAO",
            "resource": "devolucoes",
            "resourceId": devolucao_ref.id,
            "details": devolucao_data,
            "timestamp": firestore.SERVER_TIMESTAMP
        }
        transaction.set(audit_ref, audit_data)
        
        return devolucao_data

    return execute_devolucao(transaction)


def list_movimentacoes(empresa_id: str, produto_id: Optional[str] = None, tipo: Optional[str] = None, data_inicial: Optional[str] = None, data_final: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lista o histórico de movimentações da empresa com filtros opcionais."""
    db = get_firestore_client()
    query = db.collection("movimentacoes").where("empresaId", "==", empresa_id)
    
    if produto_id:
        query = query.where("produtoId", "==", produto_id)
    if tipo:
        query = query.where("tipo", "==", tipo)
        
    query = query.order_by("criadoEm", direction=firestore.Query.DESCENDING)
    
    docs = query.stream()
    result = []
    
    for doc in docs:
        data = doc.to_dict()
        # Tratamento de datas locais via Python (se existirem na query)
        criado_em = data.get("criadoEm")
        
        if data_inicial and criado_em:
            # Assumindo data_inicial em formato iso
            # Simplificação, na prática o firestore filtra melhor usando bounds
            # Como a ordenação já está definida, faremos filtro em memória para as datas caso sejam strings ISO.
            dt_criado = criado_em.replace(tzinfo=None) if hasattr(criado_em, 'replace') else None
            # Pode requerer parse da data_inicial
            
        # Retorna o dicionário serializável
        data["criadoEm"] = criado_em.isoformat() if hasattr(criado_em, 'isoformat') else str(criado_em)
        result.append(data)
        
    return result

def list_devolucoes(empresa_id: str) -> List[Dict[str, Any]]:
    """Lista as devoluções de uma empresa."""
    db = get_firestore_client()
    query = db.collection("devolucoes").where("empresaId", "==", empresa_id).order_by("criadoEm", direction=firestore.Query.DESCENDING)
    
    docs = query.stream()
    result = []
    for doc in docs:
        data = doc.to_dict()
        criado_em = data.get("criadoEm")
        if criado_em:
            data["criadoEm"] = criado_em.isoformat() if hasattr(criado_em, 'isoformat') else str(criado_em)
        result.append(data)
    return result

def get_low_stock_products(empresa_id: str) -> List[Dict[str, Any]]:
    """Retorna produtos onde quantidadeAtual < quantidadeMinima"""
    db = get_firestore_client()
    # O Firestore não suporta filtro direto onde campo A < campo B na mesma query
    # Por isso buscamos os ativos da empresa e filtramos
    query = db.collection("produtos").where("empresaId", "==", empresa_id)
    
    docs = query.stream()
    result = []
    for doc in docs:
        data = doc.to_dict()
        qtde_atual = data.get("quantidadeAtual", 0)
        qtde_minima = data.get("quantidadeMinima", 0)
        
        if qtde_atual < qtde_minima:
            criado_em = data.get("criadoEm")
            atualizado_em = data.get("atualizadoEm")
            if criado_em:
                data["criadoEm"] = criado_em.isoformat() if hasattr(criado_em, 'isoformat') else str(criado_em)
            if atualizado_em:
                data["atualizadoEm"] = atualizado_em.isoformat() if hasattr(atualizado_em, 'isoformat') else str(atualizado_em)
            result.append(data)
            
    return result
