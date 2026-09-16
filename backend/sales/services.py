import random
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from shared.firestore_client import get_db
from shared.errors import ValidationError, NotFoundError

class InsufficientStockError(ValidationError):
    """Exception raised when there is not enough stock for a sale item."""
    def __init__(self, message: str, details: Any = None):
        super().__init__(message)
        self.details = details

def generate_unique_order_number(empresa_id: str) -> str:
    """
    Gera um número de pedido único no formato 'A7' + 8 dígitos.
    Tenta até encontrar um número que não exista na base de vendas da empresa.
    """
    db = get_db()
    vendas_ref = db.collection('vendas')
    max_attempts = 10
    
    for _ in range(max_attempts):
        numero = f"A7{random.randint(10000000, 99999999)}"
        docs = vendas_ref.where('empresaId', '==', empresa_id).where('numeroPedido', '==', numero).limit(1).get()
        if len(docs) == 0:
            return numero
            
    return f"A7{random.randint(10000000, 99999999)}"

def create_sale_transaction(empresa_id: str, cliente_id: str, itens: List[Dict[str, Any]], user_id: str) -> Dict[str, Any]:
    """
    Executa a criação de venda, incluindo:
    - Validação de saldo (leitura)
    - Dedução de estoque de todos os itens (escrita)
    - Criação de movimentações (escrita)
    - Criação da venda (escrita)
    """
    db = get_db()
    
    # 1. Ler todos os produtos envolvidos
    produtos_refs = {}
    produtos_data = {}
    
    for item in itens:
        produto_id = item['produtoId']
        if produto_id not in produtos_refs:
            ref = db.collection('produtos').document(produto_id)
            produtos_refs[produto_id] = ref
            
    for p_id, ref in produtos_refs.items():
        snapshot = ref.get()
        if not snapshot.exists:
            raise ValidationError(f"Produto {p_id} não encontrado.")
        data = snapshot.to_dict()
        if data.get('empresaId') != empresa_id:
            raise ValidationError(f"Produto {p_id} não pertence a esta empresa.")
        produtos_data[p_id] = data

    # 2. Validar se TODOS os itens têm saldo suficiente
    for item in itens:
        p_id = item['produtoId']
        p_data = produtos_data[p_id]
        qtd_solicitada = item['quantidade']
        saldo_atual = p_data.get('quantidadeEstoque', 0)
        
        controla_estoque = p_data.get('controlarEstoque', True)
        if controla_estoque and saldo_atual < qtd_solicitada:
            raise InsufficientStockError(
                f"Estoque insuficiente para o produto '{p_data.get('nome', p_id)}'.",
                details={
                    "produtoId": p_id,
                    "nome": p_data.get('nome', p_id),
                    "saldoAtual": saldo_atual,
                    "quantidadeSolicitada": qtd_solicitada
                }
            )

    # 3. Gerar dados da venda
    numero_pedido = generate_unique_order_number(empresa_id)
    agora = datetime.now(timezone.utc)
    
    venda_doc_ref = db.collection('vendas').document()
    venda_id = venda_doc_ref.id
    
    total_venda = 0
    itens_processados = []
    
    # 4. Processar itens, debitar estoque e criar movimentações
    for item in itens:
        p_id = item['produtoId']
        p_data = produtos_data[p_id]
        qtd = item['quantidade']
        v_unit = item['valorUnitario']
        desc = item.get('desconto', 0)
        
        v_total_item = (qtd * v_unit) - desc
        if v_total_item < 0: v_total_item = 0
        total_venda += v_total_item
        
        item_processado = {
            "produtoId": p_id,
            "descricao": item['descricao'],
            "quantidade": qtd,
            "valorUnitario": v_unit,
            "desconto": desc,
            "valorTotal": v_total_item
        }
        itens_processados.append(item_processado)
        
        controla_estoque = p_data.get('controlarEstoque', True)
        if controla_estoque:
            novo_saldo = p_data.get('quantidadeEstoque', 0) - qtd
            produtos_refs[p_id].update({'quantidadeEstoque': novo_saldo, 'dataAtualizacao': agora.isoformat()})
            
            mov_ref = db.collection('movimentacoes').document()
            mov_data = {
                'empresaId': empresa_id,
                'produtoId': p_id,
                'tipo': 'saida',
                'quantidade': qtd,
                'motivo': f'Venda {numero_pedido}',
                'documentoReferencia': venda_id,
                'saldoAnterior': p_data.get('quantidadeEstoque', 0),
                'saldoNovo': novo_saldo,
                'dataMovimento': agora.isoformat(),
                'criadoPor': user_id,
                'dataCriacao': agora.isoformat()
            }
            mov_ref.set(mov_data)
            
    # 5. Criar o documento da Venda
    venda_data = {
        'id': venda_id,
        'empresaId': empresa_id,
        'clienteId': cliente_id,
        'numeroPedido': numero_pedido,
        'itens': itens_processados,
        'valorTotal': total_venda,
        'status': 'concluida',
        'dataVenda': agora.isoformat(),
        'criadoPor': user_id,
        'dataCriacao': agora.isoformat(),
        'dataAtualizacao': agora.isoformat()
    }
    
    venda_doc_ref.set(venda_data)
    
    return venda_data

def create_sale(empresa_id: str, cliente_id: str, itens: List[Dict[str, Any]], user_id: str) -> Dict[str, Any]:
    """Cria uma nova venda."""
    return create_sale_transaction(empresa_id, cliente_id, itens, user_id)

def list_sales(empresa_id: str, data_inicio: Optional[str] = None, data_fim: Optional[str] = None, cliente_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lista as vendas da empresa com filtros opcionais."""
    db = get_db()
    query = db.collection('vendas').where('empresaId', '==', empresa_id)
    
    if cliente_id:
        query = query.where('clienteId', '==', cliente_id)
    if status:
        query = query.where('status', '==', status)
        
    query = query.order_by('dataVenda', direction='DESCENDING')
    
    docs = query.stream()
    vendas = []
    for doc in docs:
        v_data = doc.to_dict()
        v_data['id'] = doc.id
        vendas.append(v_data)
        
    if data_inicio or data_fim:
        filtered = []
        for v in vendas:
            dt = v.get('dataVenda')
            if dt and hasattr(dt, 'timestamp'):
                dt_str = dt.strftime('%Y-%m-%d')
                if data_inicio and dt_str < data_inicio:
                    continue
                if data_fim and dt_str > data_fim:
                    continue
                filtered.append(v)
        return filtered
        
    return vendas

def get_sale(empresa_id: str, venda_id: str) -> Dict[str, Any]:
    """Retorna os detalhes de uma venda."""
    db = get_db()
    doc = db.collection('vendas').document(venda_id).get()
    
    if not doc.exists:
        raise NotFoundError("Venda não encontrada.")
        
    data = doc.to_dict()
    if data.get('empresaId') != empresa_id:
        raise NotFoundError("Venda não encontrada para esta empresa.")
        
    data['id'] = doc.id
    return data

def create_recebimento(empresa_id: str, venda_id: str, data: str, forma: str, observacoes: str, valor: float, user_id: str) -> Dict[str, Any]:
    """Registra um recebimento para a venda."""
    db = get_db()
    
    venda = get_sale(empresa_id, venda_id)
    cliente_id = venda.get('clienteId')
    
    agora = datetime.now(timezone.utc)
    rec_ref = db.collection('recebimentos').document()
    
    if not data:
        data_rec = agora
    else:
        try:
            data_rec = datetime.strptime(data, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        except ValueError:
            data_rec = agora
    
    rec_data = {
        'id': rec_ref.id,
        'empresaId': empresa_id,
        'vendaId': venda_id,
        'clienteId': cliente_id,
        'data': data_rec.isoformat(),
        'forma': forma,
        'observacoes': observacoes,
        'valor': valor,
        'criadoPor': user_id,
        'dataCriacao': agora.isoformat()
    }
    
    rec_ref.set(rec_data)
    return rec_data

def list_recebimentos(empresa_id: str, venda_id: str) -> List[Dict[str, Any]]:
    """Lista todos os recebimentos de uma venda."""
    db = get_db()
    
    get_sale(empresa_id, venda_id)
    
    docs = db.collection('recebimentos') \
        .where('empresaId', '==', empresa_id) \
        .where('vendaId', '==', venda_id) \
        .order_by('data', direction='DESCENDING') \
        .stream()
        
    return [doc.to_dict() for doc in docs]
