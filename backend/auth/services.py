"""
Service layer for authentication logic in A7SYSTEM using PostgreSQL (Supabase).
"""
import re
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from shared.models import Usuario, Empresa
from shared.jwt_auth import hash_password, verify_password
from shared.errors import ValidationError, NotFoundError, ConflictError
from shared.permissions import resolve_permissions, validar_permissoes


def serialize_user(user: Usuario) -> Dict[str, Any]:
    """
    Serializa o usuário expondo tanto as permissões gravadas quanto as efetivas.

    ``permissoes`` é o que está salvo (personalização por módulo) e
    ``permissoesEfetivas`` é o que o backend realmente aplica, já considerando
    os presets dos papéis e o acesso irrestrito do papel ``master``.
    """
    papeis = user.papeis or []
    permissoes = user.permissoes or []
    return {
        "uid": str(user.id),
        "email": user.email,
        "nome": user.nome,
        "papeis": papeis,
        "permissoes": permissoes,
        "permissoesEfetivas": sorted(resolve_permissions(papeis, permissoes)),
        "empresasIds": [str(user.empresa_id)] if user.empresa_id else [],
        "ativo": user.ativo,
    }

def validate_password_strength(senha: str) -> bool:
    if len(senha) < 8:
        return False
    if not re.search(r"[A-Z]", senha):
        return False
    if not re.search(r"[a-z]", senha):
        return False
    if not re.search(r"\d", senha):
        return False
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", senha):
        return False
    return True

def authenticate_user(email: str, senha: str, db: Session) -> Optional[Usuario]:
    """Valida as credenciais do usuário."""
    user = db.query(Usuario).filter(Usuario.email == email.lower().strip()).first()
    if not user:
        return None
    if not user.ativo:
        return None
    if not verify_password(senha, user.senha_hash):
        return None
    return user

def create_user(
    email: str,
    senha: str,
    nome: str,
    papeis: List[str],
    empresas_ids: List[str],
    db: Session,
    permissoes: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Cria um novo usuário no banco PostgreSQL."""
    email_clean = email.lower().strip()
    existing = db.query(Usuario).filter(Usuario.email == email_clean).first()
    if existing:
        raise ConflictError(f"Usuário com e-mail '{email_clean}' já cadastrado.")

    empresa_id = None
    if empresas_ids:
        try:
            empresa_id = uuid.UUID(str(empresas_ids[0]))
        except ValueError:
            pass

    try:
        permissoes_validas = validar_permissoes(permissoes)
    except ValueError as exc:
        raise ValidationError(str(exc))

    hashed = hash_password(senha)
    new_user = Usuario(
        nome=nome.strip(),
        email=email_clean,
        senha_hash=hashed,
        papeis=papeis,
        permissoes=permissoes_validas,
        empresa_id=empresa_id,
        ativo=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return serialize_user(new_user)

def update_user(
    uid: str,
    nome: Optional[str],
    papeis: Optional[List[str]],
    empresas_ids: Optional[List[str]],
    ativo: Optional[bool],
    db: Session,
    permissoes: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Atualiza os dados de um usuário no PostgreSQL."""
    user = db.query(Usuario).filter(Usuario.id == uid).first()
    if not user:
        raise NotFoundError(f"Usuário {uid} não encontrado.")

    if nome is not None:
        user.nome = nome.strip()
    if papeis is not None:
        user.papeis = papeis
    if permissoes is not None:
        try:
            user.permissoes = validar_permissoes(permissoes)
        except ValueError as exc:
            raise ValidationError(str(exc))
    if empresas_ids is not None and empresas_ids:
        user.empresa_id = uuid.UUID(str(empresas_ids[0]))
    if ativo is not None:
        user.ativo = ativo

    db.commit()
    db.refresh(user)

    return serialize_user(user)

def get_user_by_uid(uid: str, db: Session) -> Dict[str, Any]:
    """Busca usuário por ID."""
    user = db.query(Usuario).filter(Usuario.id == uid).first()
    if not user:
        raise NotFoundError(f"Usuário {uid} não encontrado.")
    return serialize_user(user)

def list_users_by_company(empresas_ids: List[str], db: Session) -> List[Dict[str, Any]]:
    """Lista usuários pertencentes às empresas informadas."""
    query = db.query(Usuario)
    if empresas_ids:
        uuids = [uuid.UUID(str(eid)) for eid in empresas_ids if eid]
        query = query.filter(Usuario.empresa_id.in_(uuids))
    users = query.all()
    return [serialize_user(u) for u in users]
