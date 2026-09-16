"""
PostgreSQL Database Adapter for A7SYSTEM.
Provides a document-style API (collections, documents, queries)
while persisting everything into PostgreSQL on Supabase.
"""
import uuid
import json
from datetime import datetime, date, timezone
from typing import Dict, Any, List, Optional, Callable, Tuple, Union
import psycopg2
from psycopg2.extras import RealDictCursor
from shared.database import DATABASE_URL
from shared.errors import NotFoundError, ForbiddenError

# Sentinel for server-side timestamps (replaces firestore.SERVER_TIMESTAMP)
class _ServerTimestamp:
    """Sentinel object that resolves to current UTC timestamp when persisted."""
    def __repr__(self):
        return "SERVER_TIMESTAMP"

SERVER_TIMESTAMP = _ServerTimestamp()

TABLE_MAP = {
    "empresas": "empresas",
    "usuarios": "usuarios",
    "fornecedores": "fornecedores",
    "clientes": "clientes",
    "produtos": "produtos",
    "movimentacoes": "movimentacoes_estoque",
    "movimentacoes_estoque": "movimentacoes_estoque",
    "compras": "compras",
    "parcelas": "parcelas_pagar",
    "parcelas_pagar": "parcelas_pagar",
    "vendas": "vendas",
    "itens_venda": "itens_venda",
    "crm_leads": "crm_leads",
    "leads": "crm_leads",
    "auditoria": "logs_auditoria",
    "logs_auditoria": "logs_auditoria"
}

def get_connection():
    """Get a raw psycopg2 connection."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn

def resolve_table(collection: str) -> str:
    return TABLE_MAP.get(collection.lower(), collection.lower())

def serialize_value(val: Any) -> Any:
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, uuid.UUID):
        return str(val)
    if isinstance(val, _ServerTimestamp):
        return datetime.now(timezone.utc).isoformat()
    return val

def clean_data(data: Dict[str, Any]) -> Dict[str, Any]:
    cleaned = {}
    for k, v in data.items():
        if isinstance(v, dict):
            cleaned[k] = clean_data(v)
        elif isinstance(v, list):
            cleaned[k] = [serialize_value(x) for x in v]
        else:
            cleaned[k] = serialize_value(v)
    return cleaned

def row_to_dict(row: dict) -> dict:
    """Converts a database row and its JSONB dados into a unified dictionary."""
    data = dict(row.get("dados") or {})
    for k, v in row.items():
        if k == "dados":
            continue
        data[k] = serialize_value(v)
    
    # Standardize common fields
    data["id"] = str(row["id"])
    if "empresa_id" in row and row["empresa_id"]:
        data["empresaId"] = str(row["empresa_id"])
    if "usuario_id" in row and row["usuario_id"]:
        data["usuarioId"] = str(row["usuario_id"])
    if "criado_em" in row and row["criado_em"]:
        data["criadoEm"] = serialize_value(row["criado_em"])
    if "atualizado_em" in row and row["atualizado_em"]:
        data["atualizadoEm"] = serialize_value(row["atualizado_em"])
    return data

class DocSnapshot:
    def __init__(self, doc_id: str, data: Optional[Dict[str, Any]], exists: bool, ref=None):
        self.id = doc_id
        self._data = data or {}
        self.exists = exists
        self.reference = ref

    def to_dict(self) -> Dict[str, Any]:
        return self._data.copy()

class DocRef:
    def __init__(self, collection: str, doc_id: str):
        self.collection_name = collection
        self.table_name = resolve_table(collection)
        self.id = doc_id

    def get(self, transaction=None) -> DocSnapshot:
        try:
            data = get_document(self.collection_name, self.id)
            return DocSnapshot(self.id, data, exists=True, ref=self)
        except NotFoundError:
            return DocSnapshot(self.id, None, exists=False, ref=self)
        except Exception:
            return DocSnapshot(self.id, None, exists=False, ref=self)

    def set(self, data: Dict[str, Any]) -> None:
        create_document(self.collection_name, data, doc_id=self.id)

    def update(self, data: Dict[str, Any]) -> None:
        update_document(self.collection_name, self.id, data)

    def delete(self) -> None:
        delete_document(self.collection_name, self.id)

class QueryRef:
    def __init__(self, collection: str):
        self.collection_name = collection
        self.table_name = resolve_table(collection)
        self._filters: List[Tuple[str, str, Any]] = []
        self._order_by: Optional[str] = None
        self._limit: Optional[int] = None
        self._offset: Optional[int] = None

    def where(self, field_or_filter=None, op=None, val=None, filter=None) -> "QueryRef":
        new_q = QueryRef(self.collection_name)
        new_q._filters = list(self._filters)
        new_q._order_by = self._order_by
        new_q._limit = self._limit
        new_q._offset = self._offset

        target_filter = filter or field_or_filter
        if hasattr(target_filter, "field_path"):
            # FieldFilter-style object with field_path, op_string, value attributes
            new_q._filters.append((target_filter.field_path, target_filter.op_string, target_filter.value))
        elif op is not None:
            new_q._filters.append((field_or_filter, op, val))
        return new_q

    def limit(self, count: int) -> "QueryRef":
        new_q = QueryRef(self.collection_name)
        new_q._filters = list(self._filters)
        new_q._order_by = self._order_by
        new_q._limit = count
        new_q._offset = self._offset
        return new_q

    def offset(self, count: int) -> "QueryRef":
        new_q = QueryRef(self.collection_name)
        new_q._filters = list(self._filters)
        new_q._order_by = self._order_by
        new_q._limit = self._limit
        new_q._offset = count
        return new_q

    def order_by(self, field: str, direction=None) -> "QueryRef":
        new_q = QueryRef(self.collection_name)
        new_q._filters = list(self._filters)
        prefix = "-" if str(direction).lower() in ["desc", "descending"] else ""
        new_q._order_by = f"{prefix}{field}"
        new_q._limit = self._limit
        new_q._offset = self._offset
        return new_q

    def stream(self) -> List[DocSnapshot]:
        docs = list_documents(
            self.collection_name, 
            filters=self._filters, 
            order_by=self._order_by, 
            limit=self._limit or 100, 
            offset=self._offset
        )
        return [DocSnapshot(d["id"], d, exists=True, ref=DocRef(self.collection_name, d["id"])) for d in docs]

    def get(self) -> List[DocSnapshot]:
        return self.stream()

class CollectionRef(QueryRef):
    def document(self, doc_id: Optional[str] = None) -> DocRef:
        actual_id = doc_id if doc_id else str(uuid.uuid4())
        return DocRef(self.collection_name, actual_id)

    def add(self, data: Dict[str, Any]) -> Tuple[Any, DocRef]:
        new_id = create_document(self.collection_name, data)
        return datetime.now(timezone.utc), DocRef(self.collection_name, new_id)

class DatabaseAdapter:
    def collection(self, name: str) -> CollectionRef:
        return CollectionRef(name)

    def document(self, path: str) -> DocRef:
        parts = path.strip("/").split("/")
        return DocRef(parts[0], parts[1])

    def transaction(self):
        class DummyTx:
            def __enter__(self):
                return self
            def __exit__(self, exc_type, exc_val, exc_tb):
                pass
            def get(self, doc_ref):
                return doc_ref.get()
            def set(self, doc_ref, data):
                doc_ref.set(data)
            def update(self, doc_ref, data):
                doc_ref.update(data)
            def delete(self, doc_ref):
                doc_ref.delete()
        return DummyTx()

    def batch(self):
        return self.transaction()

# Singleton DB instance
_db_instance = DatabaseAdapter()

def get_firestore_client() -> DatabaseAdapter:
    return _db_instance

def get_db() -> DatabaseAdapter:
    return _db_instance

# Top-level Document Functions
def get_document(collection: str, doc_id: str, empresa_id: Optional[str] = None) -> Dict[str, Any]:
    table = resolve_table(collection)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SELECT * FROM {table} WHERE id::text = %s LIMIT 1;", (str(doc_id),))
            row = cur.fetchone()
            if not row:
                raise NotFoundError(f"Document {doc_id} not found in {collection}.")
            data = row_to_dict(dict(row))
            if empresa_id and data.get("empresaId") and data["empresaId"] != str(empresa_id):
                raise ForbiddenError("Access to this document is denied.")
            return data
    finally:
        conn.close()

def camel_to_snake(name: str) -> str:
    import re
    return re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()

def list_documents(
    collection: str, 
    filters: List[Tuple[str, str, Any]] = None, 
    order_by: str = None, 
    limit: int = 50, 
    offset: int = None,
    empresa_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    table = resolve_table(collection)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = f"SELECT * FROM {table}"
            where_clauses = []
            params = []

            # Multi-tenancy check
            if empresa_id:
                where_clauses.append("(empresa_id::text = %s OR dados->>'empresaId' = %s)")
                params.extend([str(empresa_id), str(empresa_id)])

            if filters:
                for f in filters:
                    field, op, val = f[0], f[1], f[2]
                    field_snake = camel_to_snake(field)
                    
                    if op in ["==", "="]:
                        if field in ["empresaId", "empresa_id"]:
                            where_clauses.append("(empresa_id::text = %s OR dados->>'empresaId' = %s)")
                            params.extend([str(val), str(val)])
                        else:
                            where_clauses.append(f"(dados->>'{field}' = %s OR dados->>'{field_snake}' = %s)")
                            params.extend([str(val), str(val)])
                    elif op == "in" and isinstance(val, (list, tuple)):
                        where_clauses.append(f"(dados->>'{field}' = ANY(%s) OR dados->>'{field_snake}' = ANY(%s))")
                        params.extend([list(map(str, val)), list(map(str, val))])
                    elif op in [">", ">=", "<", "<="]:
                        where_clauses.append(f"(COALESCE(dados->>'{field}', dados->>'{field_snake}'))::numeric {op} %s")
                        params.append(val)

            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)

            if order_by:
                desc = "DESC" if order_by.startswith("-") else "ASC"
                query += f" ORDER BY criado_em {desc}"
            else:
                query += " ORDER BY criado_em DESC"

            if limit:
                query += f" LIMIT {int(limit)}"
            if offset:
                query += f" OFFSET {int(offset)}"

            try:
                cur.execute(query, tuple(params))
                rows = cur.fetchall()
                return [row_to_dict(dict(r)) for r in rows]
            except Exception as e:
                conn.rollback()
                print(f"[list_documents] Erro na consulta: {e}")
                return []
    finally:
        conn.close()

def create_document(collection: str, data: Dict[str, Any], doc_id: Optional[str] = None) -> str:
    table = resolve_table(collection)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            actual_id = str(doc_id) if doc_id else str(uuid.uuid4())
            data_clean = clean_data(data)
            
            # Extract basic foreign keys
            empresa_id = data_clean.get("empresaId") or data_clean.get("empresa_id")
            empresa_val = str(empresa_id) if empresa_id else None
            
            # Extract common columns
            cnpj = data_clean.get("cnpj")
            razao_social = data_clean.get("razaoSocial") or data_clean.get("razao_social") or data_clean.get("nome") or "N/A"
            codigo_sistema = data_clean.get("codigoSistema") or data_clean.get("codigo_sistema") or f"SIS-{actual_id[:8]}"
            descricao = data_clean.get("descricao") or data_clean.get("nome") or "Sem descrição"
            nome = data_clean.get("nome") or razao_social
            
            if table == "empresas":
                cur.execute("""
                    INSERT INTO empresas (id, razao_social, cnpj, dados)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados
                    RETURNING id;
                """, (actual_id, razao_social, cnpj or f"TEMP-{actual_id[:10]}", json.dumps(data_clean)))
            elif table == "produtos" and empresa_val:
                cur.execute("""
                    INSERT INTO produtos (id, empresa_id, codigo_sistema, descricao, valor_unitario, quantidade, dados)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados
                    RETURNING id;
                """, (actual_id, empresa_val, codigo_sistema, descricao, float(data_clean.get("valorUnitario", 0) or 0), int(data_clean.get("quantidade", 0) or 0), json.dumps(data_clean)))
            elif table == "clientes" and empresa_val:
                cur.execute("""
                    INSERT INTO clientes (id, empresa_id, nome, dados)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados
                    RETURNING id;
                """, (actual_id, empresa_val, nome, json.dumps(data_clean)))
            elif table == "fornecedores" and empresa_val:
                cur.execute("""
                    INSERT INTO fornecedores (id, empresa_id, razao_social, dados)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados
                    RETURNING id;
                """, (actual_id, empresa_val, razao_social, json.dumps(data_clean)))
            elif table in ["vendas", "compras", "movimentacoes_estoque", "parcelas_pagar", "crm_leads"] and empresa_val:
                cur.execute(f"""
                    INSERT INTO {table} (id, empresa_id, dados)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados
                    RETURNING id;
                """, (actual_id, empresa_val, json.dumps(data_clean)))
            else:
                # Generic insert
                cur.execute(f"""
                    INSERT INTO {table} (id, dados)
                    VALUES (%s, %s)
                    ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados
                    RETURNING id;
                """, (actual_id, json.dumps(data_clean)))
                
            return actual_id
    finally:
        conn.close()

def update_document(collection: str, doc_id: str, data: Dict[str, Any], empresa_id: Optional[str] = None) -> None:
    table = resolve_table(collection)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            data_clean = clean_data(data)
            cur.execute(f"""
                UPDATE {table}
                SET dados = COALESCE(dados, '{{}}'::jsonb) || %s::jsonb
                WHERE id::text = %s;
            """, (json.dumps(data_clean), str(doc_id)))
    finally:
        conn.close()

def delete_document(collection: str, doc_id: str, empresa_id: Optional[str] = None) -> None:
    table = resolve_table(collection)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM {table} WHERE id::text = %s;", (str(doc_id),))
    finally:
        conn.close()

def run_transaction(callback: Callable) -> Any:
    return callback(None, _db_instance)

def batch_write(operations: List[Callable]) -> None:
    for op in operations:
        op(None, _db_instance)
