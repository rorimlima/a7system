"""
Serviços do módulo de CRM (Customer Relationship Management).
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any
from shared.firestore_client import get_firestore_client
from shared.errors import A7SystemError

db = get_firestore_client()

def get_top_clients(empresa_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Retorna os top clientes por valor total comprado.
    Agrega vendas por clienteId.
    """
    vendas_ref = db.collection("vendas")
    # Filtra vendas concluídas da empresa
    vendas_query = vendas_ref.where("empresaId", "==", empresa_id)\
                             .where("status", "in", ["concluida", "entregue"]).stream()
    
    agregado = {}
    for venda in vendas_query:
        v = venda.to_dict()
        cliente_id = v.get("clienteId")
        if not cliente_id:
            continue
        
        valor = float(v.get("valorTotal", 0))
        data_venda = v.get("dataVenda")
        
        if cliente_id not in agregado:
            agregado[cliente_id] = {
                "clienteId": cliente_id,
                "clienteNome": v.get("clienteNome", "Desconhecido"),
                "totalComprado": 0.0,
                "qtdCompras": 0,
                "ultimaCompra": data_venda
            }
        
        agregado[cliente_id]["totalComprado"] += valor
        agregado[cliente_id]["qtdCompras"] += 1
        
        # Atualiza última compra se a atual for mais recente
        if data_venda and (not agregado[cliente_id]["ultimaCompra"] or data_venda > agregado[cliente_id]["ultimaCompra"]):
            agregado[cliente_id]["ultimaCompra"] = data_venda

    # Buscar informações adicionais do cliente (como região)
    resultado = list(agregado.values())
    
    # Ordenar por totalComprado desc e pegar os tops
    resultado.sort(key=lambda x: x["totalComprado"], reverse=True)
    top_resultado = resultado[:limit]
    
    # Adicionar dados extras do cliente se precisar
    for res in top_resultado:
        cliente_doc = db.collection("clientes").document(res["clienteId"]).get()
        if cliente_doc.exists:
            c_data = cliente_doc.to_dict()
            res["regiao"] = c_data.get("bairro", c_data.get("cidade", "N/A"))
        else:
            res["regiao"] = "N/A"
            
    return top_resultado

def get_client_history(empresa_id: str, cliente_id: str) -> Dict[str, Any]:
    """
    Retorna o histórico completo de um cliente: vendas, recebimentos, totais.
    """
    # Verificar se cliente existe e pertence à empresa
    cliente_doc = db.collection("clientes").document(cliente_id).get()
    if not cliente_doc.exists:
        raise A7SystemError("Cliente não encontrado", 404)
        
    c_data = cliente_doc.to_dict()
    if c_data.get("empresaId") != empresa_id:
        raise A7SystemError("Cliente não pertence a esta empresa", 403)
        
    # Buscar vendas
    vendas = []
    vendas_query = db.collection("vendas")\
                     .where("empresaId", "==", empresa_id)\
                     .where("clienteId", "==", cliente_id).stream()
                     
    total_gasto = 0.0
    for v_doc in vendas_query:
        v = v_doc.to_dict()
        v["id"] = v_doc.id
        vendas.append(v)
        if v.get("status") in ["concluida", "entregue"]:
            total_gasto += float(v.get("valorTotal", 0))
            
    # Ordenar vendas por data desc
    vendas.sort(key=lambda x: x.get("dataVenda", ""), reverse=True)
    
    qtd_compras = len([v for v in vendas if v.get("status") in ["concluida", "entregue"]])
    ticket_medio = total_gasto / qtd_compras if qtd_compras > 0 else 0
    primeira_compra = vendas[-1].get("dataVenda") if vendas else None
    ultima_compra = vendas[0].get("dataVenda") if vendas else None
    
    # Buscar recebimentos
    recebimentos = []
    receb_query = db.collection("recebimentos")\
                    .where("empresaId", "==", empresa_id)\
                    .where("clienteId", "==", cliente_id).stream()
                    
    for r_doc in receb_query:
        r = r_doc.to_dict()
        r["id"] = r_doc.id
        recebimentos.append(r)
        
    recebimentos.sort(key=lambda x: x.get("dataVencimento", ""), reverse=True)

    return {
        "cliente": {
            "id": cliente_id,
            "nome": c_data.get("nome"),
            "documento": c_data.get("documento"),
            "email": c_data.get("email"),
            "telefone": c_data.get("telefone"),
            "regiao": c_data.get("bairro", c_data.get("cidade", ""))
        },
        "resumo": {
            "totalGasto": total_gasto,
            "qtdCompras": qtd_compras,
            "ticketMedio": ticket_medio,
            "primeiraCompra": primeira_compra,
            "ultimaCompra": ultima_compra
        },
        "vendas": vendas,
        "recebimentos": recebimentos
    }

def get_clients_by_region(empresa_id: str) -> List[Dict[str, Any]]:
    """
    Retorna a distribuição de clientes por região.
    """
    clientes_query = db.collection("clientes").where("empresaId", "==", empresa_id).stream()
    
    regioes = {}
    total = 0
    for doc in clientes_query:
        c = doc.to_dict()
        regiao = c.get("bairro", c.get("cidade", "Outros")).strip()
        if not regiao:
            regiao = "Outros"
            
        if regiao not in regioes:
            regioes[regiao] = 0
        regioes[regiao] += 1
        total += 1
        
    resultado = [{"regiao": k, "quantidade": v, "percentual": (v / total * 100) if total > 0 else 0} for k, v in regioes.items()]
    resultado.sort(key=lambda x: x["quantidade"], reverse=True)
    return resultado

def get_inactive_clients(empresa_id: str, dias: int = 90) -> List[Dict[str, Any]]:
    """
    Retorna clientes que não compram há mais de N dias.
    """
    data_limite = (datetime.utcnow() - timedelta(days=dias)).isoformat()
    
    # Busca clientes ativos
    clientes_query = db.collection("clientes")\
                       .where("empresaId", "==", empresa_id)\
                       .where("ativo", "==", True).stream()
                       
    inativos = []
    for c_doc in clientes_query:
        c = c_doc.to_dict()
        c_id = c_doc.id
        
        # Busca a última venda deste cliente
        ultima_venda_query = db.collection("vendas")\
                               .where("empresaId", "==", empresa_id)\
                               .where("clienteId", "==", c_id)\
                               .order_by("dataVenda", direction="DESCENDING")\
                               .limit(1).stream()
                               
        ultima_venda = next(ultima_venda_query, None)
        data_ultima = ultima_venda.to_dict().get("dataVenda") if ultima_venda else c.get("dataCadastro")
        
        if not data_ultima or data_ultima < data_limite:
            if data_ultima:
                try:
                    d1 = datetime.fromisoformat(data_ultima.replace("Z", "+00:00") if "Z" in data_ultima else data_ultima)
                    dias_inativo = (datetime.utcnow().replace(tzinfo=d1.tzinfo) - d1).days
                except:
                    dias_inativo = dias
            else:
                dias_inativo = "Desconhecido"
                
            inativos.append({
                "id": c_id,
                "nome": c.get("nome"),
                "telefone": c.get("telefone"),
                "email": c.get("email"),
                "ultimaCompra": data_ultima,
                "diasInativo": dias_inativo
            })
            
    inativos.sort(key=lambda x: x["diasInativo"] if isinstance(x["diasInativo"], int) else 9999, reverse=True)
    return inativos

def get_crm_metrics(empresa_id: str) -> Dict[str, Any]:
    """
    Retorna métricas gerais de CRM.
    """
    # Total de clientes e novos nos últimos 30 dias
    clientes_query = db.collection("clientes").where("empresaId", "==", empresa_id).stream()
    
    total_clientes = 0
    novos_30_dias = 0
    data_limite_30d = (datetime.utcnow() - timedelta(days=30)).isoformat()
    
    for c in clientes_query:
        total_clientes += 1
        dt_cad = c.to_dict().get("dataCadastro", "")
        if dt_cad and dt_cad >= data_limite_30d:
            novos_30_dias += 1
            
    # Ticket médio global (das vendas dos últimos 30 dias, por ex, ou global)
    # Vamos fazer global
    vendas_query = db.collection("vendas")\
                     .where("empresaId", "==", empresa_id)\
                     .where("status", "in", ["concluida", "entregue"]).stream()
                     
    total_receita = 0.0
    qtd_vendas = 0
    clientes_com_compras = set()
    clientes_recorrentes = set()
    
    for v in vendas_query:
        v_dict = v.to_dict()
        total_receita += float(v_dict.get("valorTotal", 0))
        qtd_vendas += 1
        
        c_id = v_dict.get("clienteId")
        if c_id:
            if c_id in clientes_com_compras:
                clientes_recorrentes.add(c_id)
            else:
                clientes_com_compras.add(c_id)
                
    ticket_medio = total_receita / qtd_vendas if qtd_vendas > 0 else 0
    taxa_retorno = (len(clientes_recorrentes) / len(clientes_com_compras) * 100) if len(clientes_com_compras) > 0 else 0
    
    return {
        "totalClientes": total_clientes,
        "novosUltimoMes": novos_30_dias,
        "ticketMedio": ticket_medio,
        "taxaRetorno": taxa_retorno
    }
