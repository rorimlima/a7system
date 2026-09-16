"""
Serviços para gerenciamento de compras (Purchases).
Lida com a criação transacional de compras, movimentações de estoque e contas a pagar.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from google.cloud import firestore

from shared.firebase_init import get_firestore_client
from shared.errors import NotFoundError, ValidationError, ConflictError
from shared.validators import generate_product_code
from shared.audit import log_action

def generate_installments(
    total: float, 
    num_parcelas: int, 
    data_base: str, 
    intervalo_dias: int, 
    valores_custom: Optional[List[float]] = None
) -> List[Dict[str, Any]]:
    """Gera as parcelas de uma compra."""
    if num_parcelas <= 0:
        raise ValidationError("Número de parcelas deve ser maior que zero.")
    
    parcelas = []
    
    try:
        base_date = datetime.strptime(data_base, "%Y-%m-%d")
    except ValueError:
        raise ValidationError("dataBase deve estar no formato YYYY-MM-DD")
    
    if valores_custom:
        if len(valores_custom) != num_parcelas:
            raise ValidationError("A quantidade de valores customizados não bate com o número de parcelas.")
        
        # Prevenindo erro de precisão no float
        if abs(sum(valores_custom) - total) > 0.01:
            raise ValidationError(f"A soma das parcelas ({sum(valores_custom)}) deve ser igual ao total ({total}).")
            
        valores = valores_custom
    else:
        # Dividir igualmente
        valor_base = round(total / num_parcelas, 2)
        valores = [valor_base] * num_parcelas
        # Ajustar a última parcela para possíveis diferenças de arredondamento
        diff = total - sum(valores)
        if diff != 0:
            valores[-1] = round(valores[-1] + diff, 2)
            
    for i in range(num_parcelas):
        vencimento = base_date + timedelta(days=i * intervalo_dias)
        
        parcela = {
            "numero": i + 1,
            "vencimento": vencimento.strftime("%Y-%m-%d"),
            "valor": valores[i],
            "jurosMulta": 0.0,
            "status": "emAberto",
            "pagoEm": None,
            "formaPagamento": None,
            "observacoes": None
        }
        parcelas.append(parcela)
        
    return parcelas

@firestore.transactional
def _create_purchase_transaction(transaction, db, empresa_id: str, fornecedor_id: str, data_compra: str, numero_nota: Optional[str], itens: List[Dict], parcelamento: Dict, user_id: str) -> str:
    """Lógica interna transacional para criação de compra."""
    
    # 1. Validar fornecedor
    fornecedor_ref = db.collection("fornecedores").document(fornecedor_id)
    fornecedor_doc = fornecedor_ref.get(transaction=transaction)
    if not fornecedor_doc.exists:
        raise NotFoundError("Fornecedor não encontrado.")
    
    if fornecedor_doc.to_dict().get("empresaId") != empresa_id:
        raise ValidationError("Fornecedor não pertence à empresa atual.")
    
    # 2. Processar itens (soma, atualização de estoque)
    valor_total = 0.0
    produtos_para_atualizar = []
    produtos_para_criar = []
    movimentacoes_para_criar = []
    
    # Pré-carregar todos os produtos que possuem ID
    produto_refs = {}
    for item in itens:
        if item.get("produtoId"):
            pid = item["produtoId"]
            if pid not in produto_refs:
                pref = db.collection("produtos").document(pid)
                pdoc = pref.get(transaction=transaction)
                if not pdoc.exists:
                    raise NotFoundError(f"Produto {pid} não encontrado.")
                if pdoc.to_dict().get("empresaId") != empresa_id:
                    raise ValidationError(f"Produto {pid} não pertence a esta empresa.")
                produto_refs[pid] = {"ref": pref, "doc": pdoc.to_dict()}
    
    for item in itens:
        qtd = item.get("quantidade", 0)
        v_unit = item.get("valorUnitario", 0.0)
        desconto = item.get("desconto", 0.0)
        
        if qtd <= 0 or v_unit < 0 or desconto < 0:
            raise ValidationError("Valores de quantidade, valor unitário e desconto devem ser válidos.")
            
        valor_item = (qtd * v_unit) - desconto
        if valor_item < 0:
            raise ValidationError("O valor do item após desconto não pode ser negativo.")
            
        valor_total += valor_item
        
        prod_id = item.get("produtoId")
        if prod_id:
            # Produto existe
            prod_data = produto_refs[prod_id]["doc"]
            qtd_atual = prod_data.get("quantidadeAtual", 0)
            nova_qtd = qtd_atual + qtd
            
            produtos_para_atualizar.append({
                "ref": produto_refs[prod_id]["ref"],
                "data": {
                    "quantidadeAtual": nova_qtd,
                    "ultimaCompra": data_compra,
                    "valorCusto": v_unit,  # Atualizando custo base (opcional/padrão)
                    "updatedAt": firestore.SERVER_TIMESTAMP
                }
            })
            final_prod_id = prod_id
        else:
            # Novo produto
            new_prod_ref = db.collection("produtos").document()
            
            novo_prod = {
                "id": new_prod_ref.id,
                "empresaId": empresa_id,
                "codigo": generate_product_code(),
                "descricao": item.get("descricao"),
                "codigoFornecedor": item.get("codigoFornecedor"),
                "ncm": item.get("ncm"),
                "cfop": item.get("cfop"),
                "cst": item.get("cst"),
                "quantidadeAtual": qtd,
                "quantidadeMinima": 0, # Padrão
                "valorCusto": v_unit,
                "valorVenda": v_unit, # Placeholder
                "fotos": item.get("fotos", []),
                "ultimaCompra": data_compra,
                "createdAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP,
                "createdBy": user_id,
                "ativo": True
            }
            produtos_para_criar.append({
                "ref": new_prod_ref,
                "data": novo_prod
            })
            final_prod_id = new_prod_ref.id
            
        # Movimentação
        mov_ref = db.collection("movimentacoes").document()
        movimentacoes_para_criar.append({
            "ref": mov_ref,
            "data": {
                "id": mov_ref.id,
                "empresaId": empresa_id,
                "produtoId": final_prod_id,
                "tipo": "entrada",
                "quantidade": qtd,
                "valorUnitario": v_unit,
                "motivo": f"Compra {numero_nota}" if numero_nota else "Compra de fornecedor",
                "dataMovimentacao": firestore.SERVER_TIMESTAMP,
                "createdBy": user_id
            }
        })
        
        # Atualiza o ID no item para salvar na compra
        item["produtoId"] = final_prod_id

    # 3. Gerar parcelas do contas a pagar
    parcelas = generate_installments(
        total=valor_total,
        num_parcelas=parcelamento.get("numeroParcelas", 1),
        data_base=parcelamento.get("dataBase"),
        intervalo_dias=parcelamento.get("intervaloDias", 30),
        valores_custom=parcelamento.get("valores")
    )
    
    # 4. Criar Compra
    compra_ref = db.collection("compras").document()
    compra_data = {
        "id": compra_ref.id,
        "empresaId": empresa_id,
        "fornecedorId": fornecedor_id,
        "dataCompra": data_compra,
        "numeroNota": numero_nota,
        "itens": itens,
        "condicaoPagamento": None,
        "parcelamento": parcelamento,
        "valorTotal": valor_total,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "createdBy": user_id
    }
    
    # 5. Criar Contas a Pagar
    conta_ref = db.collection("contasAPagar").document()
    conta_data = {
        "id": conta_ref.id,
        "empresaId": empresa_id,
        "fornecedorId": fornecedor_id,
        "compraId": compra_ref.id,
        "descricao": f"Compra {numero_nota}" if numero_nota else f"Compra via API ({data_compra})",
        "valorTotal": valor_total,
        "totalParcelas": len(parcelas),
        "parcelas": parcelas,
        "valorPago": 0.0,
        "valorEmAberto": valor_total,
        "status": "emAberto",
        "createdAt": firestore.SERVER_TIMESTAMP,
        "createdBy": user_id,
        "updatedAt": firestore.SERVER_TIMESTAMP
    }
    
    # --- Executar escritas na transação ---
    for prod in produtos_para_atualizar:
        transaction.update(prod["ref"], prod["data"])
        
    for prod in produtos_para_criar:
        transaction.set(prod["ref"], prod["data"])
        
    for mov in movimentacoes_para_criar:
        transaction.set(mov["ref"], mov["data"])
        
    transaction.set(compra_ref, compra_data)
    transaction.set(conta_ref, conta_data)
    
    # O auditoria será feita fora da transação
    return compra_ref.id, conta_ref.id, valor_total


def create_purchase(empresa_id: str, fornecedor_id: str, data_compra: str, numero_nota: Optional[str], itens: List[Dict], parcelamento: Dict, user_id: str) -> Dict[str, Any]:
    """Serviço principal para criar uma compra e tudo que envolve."""
    db = get_firestore_client()
    transaction = db.transaction()
    
    compra_id, conta_id, total = _create_purchase_transaction(
        transaction, db, empresa_id, fornecedor_id, data_compra, numero_nota, itens, parcelamento, user_id
    )
    
    log_action(empresa_id, user_id, "criar_compra", compra_id, None, {"total": total, "contaAPagar": conta_id})
    return get_purchase(empresa_id, compra_id)


def list_purchases(empresa_id: str, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Lista as compras da empresa."""
    db = get_firestore_client()
    query = db.collection("compras").where("empresaId", "==", empresa_id)
    
    if "fornecedorId" in filters and filters["fornecedorId"]:
        query = query.where("fornecedorId", "==", filters["fornecedorId"])
        
    # Mais filtros como data_inicio e data_fim podem ser aplicados em memória ou via índices se configurados
    
    docs = query.get()
    result = []
    for doc in docs:
        d = doc.to_dict()
        result.append(d)
        
    return result


def get_purchase(empresa_id: str, compra_id: str) -> Dict[str, Any]:
    """Detalhes de uma compra específica."""
    db = get_firestore_client()
    doc_ref = db.collection("compras").document(compra_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise NotFoundError("Compra não encontrada.")
        
    data = doc.to_dict()
    if data.get("empresaId") != empresa_id:
        raise ValidationError("Esta compra não pertence a esta empresa.")
        
    return data
