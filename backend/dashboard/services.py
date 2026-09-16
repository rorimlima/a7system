from shared.firestore_client import get_db
import datetime

def get_kpis(empresa_id: str, data_inicial: str = None, data_final: str = None) -> dict:
    db = get_db()
    
    total_vendas = 0.0
    qtd_vendas = 0
    total_compras = 0.0
    qtd_compras = 0
    contas_pagar_aberto = 0.0
    contas_pagar_atrasadas = 0.0
    qtd_contas_atrasadas = 0
    total_recebimentos = 0.0
    produtos_estoque_critico = 0
    
    # 1. Vendas
    vendas_query = db.collection('vendas').where('empresaId', '==', empresa_id)
    if data_inicial:
        vendas_query = vendas_query.where('dataCriacao', '>=', f"{data_inicial}T00:00:00")
    if data_final:
        vendas_query = vendas_query.where('dataCriacao', '<=', f"{data_final}T23:59:59")
    
    vendas_docs = vendas_query.stream()
    for doc in vendas_docs:
        venda = doc.to_dict()
        if venda.get('status') != 'cancelada':
            total_vendas += venda.get('valorTotal', 0)
            qtd_vendas += 1

    # 2. Compras
    compras_query = db.collection('compras').where('empresaId', '==', empresa_id)
    if data_inicial:
        compras_query = compras_query.where('data', '>=', data_inicial)
    if data_final:
        compras_query = compras_query.where('data', '<=', data_final)
        
    compras_docs = compras_query.stream()
    for doc in compras_docs:
        compra = doc.to_dict()
        total_compras += compra.get('valorTotal', 0)
        qtd_compras += 1

    # 3. Contas a Pagar
    hoje = datetime.datetime.now().strftime("%Y-%m-%d")
    contas_query = db.collection('contasAPagar').where('empresaId', '==', empresa_id).where('status', 'in', ['pendente', 'atrasada'])
    contas_docs = contas_query.stream()
    for doc in contas_docs:
        conta = doc.to_dict()
        valor = conta.get('valor', 0)
        vencimento = conta.get('vencimento')
        
        contas_pagar_aberto += valor
        if vencimento and vencimento < hoje:
            contas_pagar_atrasadas += valor
            qtd_contas_atrasadas += 1

    # 4. Recebimentos
    rec_query = db.collection('recebimentos').where('empresaId', '==', empresa_id)
    if data_inicial:
        rec_query = rec_query.where('data', '>=', data_inicial)
    if data_final:
        rec_query = rec_query.where('data', '<=', data_final)
        
    rec_docs = rec_query.stream()
    for doc in rec_docs:
        rec = doc.to_dict()
        total_recebimentos += rec.get('valor', 0)

    # 5. Estoque Crítico
    prod_query = db.collection('produtos').where('empresaId', '==', empresa_id)
    prod_docs = prod_query.stream()
    for doc in prod_docs:
        prod = doc.to_dict()
        estoque_atual = prod.get('estoqueAtual', 0)
        estoque_minimo = prod.get('estoqueMinimo', 0)
        if estoque_atual <= estoque_minimo:
            produtos_estoque_critico += 1

    return {
        'total_vendas': total_vendas,
        'qtd_vendas': qtd_vendas,
        'total_compras': total_compras,
        'qtd_compras': qtd_compras,
        'saldo': total_vendas - total_compras,
        'lucro_estimado': total_vendas - total_compras,
        'contas_pagar_aberto': contas_pagar_aberto,
        'contas_pagar_atrasadas': contas_pagar_atrasadas,
        'qtd_contas_atrasadas': qtd_contas_atrasadas,
        'total_recebimentos': total_recebimentos,
        'produtos_estoque_critico': produtos_estoque_critico
    }

def get_sales_by_day(empresa_id: str, data_inicial: str = None, data_final: str = None) -> list:
    db = get_db()
    
    vendas_query = db.collection('vendas').where('empresaId', '==', empresa_id)
    if data_inicial:
        vendas_query = vendas_query.where('dataCriacao', '>=', f"{data_inicial}T00:00:00")
    if data_final:
        vendas_query = vendas_query.where('dataCriacao', '<=', f"{data_final}T23:59:59")
        
    vendas_docs = vendas_query.stream()
    sales_by_day = {}
    
    for doc in vendas_docs:
        venda = doc.to_dict()
        if venda.get('status') != 'cancelada':
            data = venda.get('dataCriacao', '').split('T')[0]
            if not data:
                continue
            valor = venda.get('valorTotal', 0)
            if data in sales_by_day:
                sales_by_day[data] += valor
            else:
                sales_by_day[data] = valor
                
    result = [{'data': k, 'valor': v} for k, v in sales_by_day.items()]
    result.sort(key=lambda x: x['data'])
    return result

def get_top_products(empresa_id: str, limit: int = 10) -> list:
    db = get_db()
    
    vendas_query = db.collection('vendas').where('empresaId', '==', empresa_id).order_by('dataCriacao', direction='DESCENDING').limit(500)
    vendas_docs = vendas_query.stream()
    
    product_sales = {}
    for doc in vendas_docs:
        venda = doc.to_dict()
        if venda.get('status') == 'cancelada':
            continue
            
        itens = venda.get('itens', [])
        for item in itens:
            pid = item.get('produtoId')
            nome = item.get('descricao', 'Produto')
            qtd = item.get('quantidade', 0)
            valor = item.get('valorUnitario', 0) * qtd
            
            if pid not in product_sales:
                product_sales[pid] = {'id': pid, 'nome': nome, 'qtd': 0, 'valor': 0}
            
            product_sales[pid]['qtd'] += qtd
            product_sales[pid]['valor'] += valor
            
    top_products = list(product_sales.values())
    top_products.sort(key=lambda x: x['valor'], reverse=True)
    return top_products[:limit]

def get_cash_flow(empresa_id: str, meses: int = 6) -> dict:
    db = get_db()
    
    hoje = datetime.datetime.now()
    meses_str = []
    for i in range(meses - 1, -1, -1):
        # Simplificando a geração dos meses
        d = hoje.replace(day=1)
        # lidando com meses anteriores corretamente
        month = d.month - i
        year = d.year
        while month <= 0:
            month += 12
            year -= 1
        meses_str.append(f"{year}-{month:02d}")
        
    cash_flow = {mes: {'entradas': 0, 'saidas': 0} for mes in meses_str}
    
    # Entradas (recebimentos)
    rec_docs = db.collection('recebimentos').where('empresaId', '==', empresa_id).stream()
    for doc in rec_docs:
        rec = doc.to_dict()
        data = rec.get('data', '')
        if len(data) >= 7:
            mes = data[:7]
            if mes in cash_flow:
                cash_flow[mes]['entradas'] += rec.get('valor', 0)
                
    # Saídas (contas a pagar pagas)
    contas_docs = db.collection('contasAPagar').where('empresaId', '==', empresa_id).where('status', '==', 'pago').stream()
    for doc in contas_docs:
        conta = doc.to_dict()
        data = conta.get('dataPagamento', '')
        if not data:
            data = conta.get('vencimento', '')
        if len(data) >= 7:
            mes = data[:7]
            if mes in cash_flow:
                cash_flow[mes]['saidas'] += conta.get('valorPago', conta.get('valor', 0))
                
    return cash_flow
