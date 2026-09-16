"""
Serviços para gerenciamento de contas a pagar e parcelas.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

from shared.firestore_client import get_firestore_client
from shared.errors import NotFoundError, ValidationError
from shared.audit import log_action

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

def list_contas_a_pagar(empresa_id: str, status: Optional[str] = None, fornecedor_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lista contas a pagar."""
    db = get_firestore_client()
    query = db.collection("contasAPagar").where("empresaId", "==", empresa_id)
    
    if status:
        query = query.where("status", "==", status)
    if fornecedor_id:
        query = query.where("fornecedorId", "==", fornecedor_id)
        
    docs = query.get()
    return [doc.to_dict() for doc in docs]

def get_conta_a_pagar(empresa_id: str, conta_id: str) -> Dict[str, Any]:
    """Detalhes de uma conta a pagar."""
    db = get_firestore_client()
    doc = db.collection("contasAPagar").document(conta_id).get()
    
    if not doc.exists:
        raise NotFoundError("Conta a pagar não encontrada.")
        
    data = doc.to_dict()
    if data.get("empresaId") != empresa_id:
        raise ValidationError("Conta a pagar não pertence a esta empresa.")
        
    return data

def get_parcelas_vencendo(empresa_id: str, dias: int = 30) -> List[Dict[str, Any]]:
    """Busca contas que tenham parcelas em aberto e com vencimento nos próximos X dias."""
    db = get_firestore_client()
    query = db.collection("contasAPagar").where("empresaId", "==", empresa_id).where("status", "==", "emAberto")
    
    hoje = datetime.now().date()
    limite = hoje + timedelta(days=dias)
    
    docs = query.get()
    resultados = []
    
    for doc in docs:
        data = doc.to_dict()
        parcelas_vencendo = []
        for p in data.get("parcelas", []):
            if p["status"] == "emAberto":
                vencimento_str = p.get("vencimento")
                if vencimento_str:
                    vencimento_date = datetime.strptime(vencimento_str, "%Y-%m-%d").date()
                    if hoje <= vencimento_date <= limite:
                        parcelas_vencendo.append(p)
        
        if parcelas_vencendo:
            data_copia = data.copy()
            data_copia["parcelasVencendo"] = parcelas_vencendo
            resultados.append(data_copia)
            
    return resultados

def get_parcelas_atrasadas(empresa_id: str) -> List[Dict[str, Any]]:
    """Busca contas com parcelas atrasadas e atualiza o status automaticamente se necessário."""
    db = get_firestore_client()
    query = db.collection("contasAPagar").where("empresaId", "==", empresa_id).where("status", "==", "emAberto")
    
    hoje = datetime.now().date()
    
    docs = query.get()
    resultados = []
    batch = db.batch()
    docs_to_update = []
    
    for doc in docs:
        data = doc.to_dict()
        precisa_atualizar = False
        parcelas = data.get("parcelas", [])
        parcelas_atrasadas = []
        
        for p in parcelas:
            if p["status"] == "emAberto":
                vencimento_str = p.get("vencimento")
                if vencimento_str:
                    vencimento_date = datetime.strptime(vencimento_str, "%Y-%m-%d").date()
                    if vencimento_date < hoje:
                        p["status"] = "atrasado"
                        precisa_atualizar = True
                        parcelas_atrasadas.append(p)
            elif p["status"] == "atrasado":
                parcelas_atrasadas.append(p)
                        
        if precisa_atualizar:
            doc_ref = db.collection("contasAPagar").document(data["id"])
            batch.update(doc_ref, {"parcelas": parcelas})
            docs_to_update.append(doc_ref)
            
        if parcelas_atrasadas:
            data_copia = data.copy()
            data_copia["parcelasAtrasadas"] = parcelas_atrasadas
            resultados.append(data_copia)
            
    if docs_to_update:
        batch.commit()
        
    return resultados

def _baixa_parcela_logic(db, empresa_id: str, conta_id: str, parcela_num: int, forma_pagamento: str, juros_multa: float, observacoes: Optional[str], user_id: str) -> Dict[str, Any]:
    doc_ref = db.collection("contasAPagar").document(conta_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise NotFoundError("Conta a pagar não encontrada.")
        
    data = doc.to_dict()
    if data.get("empresaId") != empresa_id:
        raise ValidationError("Conta a pagar não pertence a esta empresa.")
        
    parcelas = data.get("parcelas", [])
    if parcela_num < 1 or parcela_num > len(parcelas):
        raise ValidationError("Número de parcela inválido.")
        
    parcela = parcelas[parcela_num - 1]
    if parcela["status"] == "pago":
        raise ValidationError("Esta parcela já foi paga.")
        
    # Atualizar parcela
    agora = datetime.now().isoformat()
    parcela["status"] = "pago"
    parcela["pagoEm"] = agora
    parcela["formaPagamento"] = forma_pagamento
    parcela["jurosMulta"] = juros_multa
    parcela["observacoes"] = observacoes
    
    # Recalcular totais
    valor_pago = 0.0
    valor_em_aberto = 0.0
    
    for p in parcelas:
        if p["status"] == "pago":
            valor_pago += p["valor"] + p.get("jurosMulta", 0.0)
        else:
            valor_em_aberto += p["valor"]
            
    # Status final da conta
    status_conta = "pago" if valor_em_aberto <= 0.01 else "emAberto"
    
    # Prepara update
    update_data = {
        "parcelas": parcelas,
        "valorPago": round(valor_pago, 2),
        "valorEmAberto": round(valor_em_aberto, 2),
        "status": status_conta,
        "updatedAt": _now_iso()
    }
    
    doc_ref.update(update_data)
    
    nova_data = {**data, **update_data}
    return nova_data

def baixa_parcela(empresa_id: str, conta_id: str, parcela_num: int, forma_pagamento: str, juros_multa: float, observacoes: Optional[str], user_id: str) -> Dict[str, Any]:
    """Baixa uma parcela e recalcula a conta."""
    db = get_firestore_client()
    
    resultado = _baixa_parcela_logic(db, empresa_id, conta_id, parcela_num, forma_pagamento, juros_multa, observacoes, user_id)
    
    log_action(empresa_id, user_id, "baixa_parcela_pagar", conta_id, None, {"parcela": parcela_num, "forma": forma_pagamento, "jurosMulta": juros_multa})
    return resultado
