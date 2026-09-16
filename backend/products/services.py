from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from shared.firestore_client import create_document, update_document, get_document, list_documents
from shared.storage_service import get_storage_bucket
from shared.audit import log_action
from shared.validators import generate_product_code
from shared.errors import ConflictError

PRODUCTS_COLLECTION = "produtos"

def check_product_code_unique(empresa_id: str, codigo_sistema: str) -> bool:
    """Verifica se o código de sistema é único na empresa."""
    docs = list_documents(PRODUCTS_COLLECTION, filters=[
        ("empresaId", "==", empresa_id),
        ("codigoSistema", "==", codigo_sistema)
    ], limit=1)
    return len(docs) == 0

def create_product(data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Cria um novo produto com código de sistema autogerado se não existir."""
    empresa_id = data.get("empresaId")
    if not data.get("codigoSistema"):
        data["codigoSistema"] = generate_product_code()
        
    # Garante unicidade
    while not check_product_code_unique(empresa_id, data["codigoSistema"]):
        data["codigoSistema"] = generate_product_code()
        
    data["criadoEm"] = datetime.now(timezone.utc).isoformat()
    data["atualizadoEm"] = datetime.now(timezone.utc).isoformat()
    data["fotos"] = []
    
    product_id = create_document(PRODUCTS_COLLECTION, data)
    log_action(product_id, user_id, "CREATE", "produto", None, data)
    
    return get_document(PRODUCTS_COLLECTION, product_id)

def update_product(product_id: str, data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Atualiza um produto existente."""
    antes = get_document(PRODUCTS_COLLECTION, product_id)
    if not antes:
        raise ValueError("Produto não encontrado.")
        
    # Impedir alteração de codigoSistema
    if "codigoSistema" in data:
        del data["codigoSistema"]
        
    data["atualizadoEm"] = datetime.now(timezone.utc).isoformat()
    update_document(PRODUCTS_COLLECTION, product_id, data)
    
    depois = get_document(PRODUCTS_COLLECTION, product_id)
    log_action(product_id, user_id, "UPDATE", "produto", antes, depois)
    return depois

def get_product(product_id: str) -> Optional[Dict[str, Any]]:
    return get_document(PRODUCTS_COLLECTION, product_id)

def list_products(empresa_id: str, search: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lista produtos, com busca opcional por descricao ou codigo."""
    filters = [("empresaId", "==", empresa_id)]
    products = list_documents(PRODUCTS_COLLECTION, filters=filters)
    
    if search:
        search_lower = search.lower()
        products = [
            p for p in products 
            if search_lower in p.get("descricao", "").lower() or search_lower in p.get("codigoSistema", "").lower()
        ]
        
    return products

def list_low_stock_products(empresa_id: str) -> List[Dict[str, Any]]:
    """Retorna produtos com quantidadeAtual <= quantidadeMinima."""
    filters = [("empresaId", "==", empresa_id)]
    products = list_documents(PRODUCTS_COLLECTION, filters=filters)
    
    low_stock = []
    for p in products:
        qtd = p.get("quantidadeAtual", 0)
        min_qtd = p.get("quantidadeMinima", 0)
        if qtd <= min_qtd:
            low_stock.append(p)
            
    return low_stock

def upload_product_photo(product_id: str, empresa_id: str, file_bytes: bytes, file_ext: str, user_id: str) -> str:
    """Faz upload de uma foto do produto para o Storage."""
    bucket = get_storage_bucket()
    import uuid
    filename = f"{uuid.uuid4().hex}.{file_ext}"
    blob_path = f"produtos/{empresa_id}/{product_id}/{filename}"
    blob = bucket.blob(blob_path)
    
    content_type = f"image/{'jpeg' if file_ext.lower() in ['jpg', 'jpeg'] else 'png'}"
        
    blob.upload_from_string(file_bytes, content_type=content_type)
    blob.make_public()
    url = blob.public_url
    
    # Adicionar à lista de fotos
    produto = get_document(PRODUCTS_COLLECTION, product_id)
    fotos = produto.get("fotos", [])
    fotos.append(url)
    
    update_product(product_id, {"fotos": fotos}, user_id)
    return url
