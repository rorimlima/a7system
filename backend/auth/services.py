"""
Service layer for authentication logic in A7SYSTEM.
"""
import re
from typing import List, Dict, Any, Optional
from firebase_admin import auth
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

from shared.firestore_client import (
    get_document,
    list_documents,
    create_document,
    update_document
)
from shared.errors import ValidationError, NotFoundError, ConflictError

def validate_password_strength(senha: str) -> bool:
    """
    Validates if a password meets strength requirements:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    - At least 1 special character
    """
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

def create_user(email: str, senha: str, nome: str, papeis: List[str], empresas_ids: List[str]) -> Dict[str, Any]:
    """
    Creates a new user in Firebase Auth and Firestore.
    """
    if not validate_password_strength(senha):
        raise ValidationError("Senha fraca. A senha deve conter pelo menos 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.")
    
    try:
        # Create user in Firebase Auth
        user_record = auth.create_user(
            email=email,
            password=senha,
            display_name=nome
        )
    except Exception as e:
        raise ConflictError(f"Erro ao criar usuário no Auth: {str(e)}")

    uid = user_record.uid
    
    # Set custom claims
    claims = {
        "papeis": papeis,
        "empresasIds": empresas_ids
    }
    
    try:
        auth.set_custom_user_claims(uid, claims)
    except Exception as e:
        raise Exception(f"Erro ao definir custom claims: {str(e)}")

    # Create user document in Firestore
    user_data = {
        "uid": uid,
        "nome": nome,
        "email": email,
        "papeis": papeis,
        "empresasIds": empresas_ids,
        "ativo": True,
        "criadoEm": SERVER_TIMESTAMP
    }
    
    create_document("usuarios", uid, user_data)
    
    # Generate email verification link
    try:
        verification_link = auth.generate_email_verification_link(email)
        user_data["verificationLink"] = verification_link
    except Exception:
        pass # Ignore failure to generate link
        
    return user_data

def update_user(uid: str, nome: Optional[str], papeis: Optional[List[str]], empresas_ids: Optional[List[str]], ativo: Optional[bool]) -> Dict[str, Any]:
    """
    Updates a user in Firestore and Firebase Auth (claims + status).
    """
    # Fetch current user
    current_user = get_document("usuarios", uid)
    if not current_user:
        raise NotFoundError(f"Usuário {uid} não encontrado.")
    
    update_data = {}
    if nome is not None:
        update_data["nome"] = nome
    if papeis is not None:
        update_data["papeis"] = papeis
    if empresas_ids is not None:
        update_data["empresasIds"] = empresas_ids
    if ativo is not None:
        update_data["ativo"] = ativo
        
    if not update_data:
        return current_user

    # Update Firestore
    update_document("usuarios", uid, update_data)
    
    # Update auth record if necessary
    auth_kwargs = {}
    if nome is not None:
        auth_kwargs["display_name"] = nome
    if ativo is not None:
        auth_kwargs["disabled"] = not ativo
        
    if auth_kwargs:
        auth.update_user(uid, **auth_kwargs)
        
    # Update custom claims if roles or companies changed
    if papeis is not None or empresas_ids is not None:
        final_papeis = papeis if papeis is not None else current_user.get("papeis", [])
        final_empresas = empresas_ids if empresas_ids is not None else current_user.get("empresasIds", [])
        
        claims = {
            "papeis": final_papeis,
            "empresasIds": final_empresas
        }
        auth.set_custom_user_claims(uid, claims)

    return {**current_user, **update_data}

def get_user_by_uid(uid: str) -> Dict[str, Any]:
    """
    Gets user details from Firestore.
    """
    user = get_document("usuarios", uid)
    if not user:
        raise NotFoundError(f"Usuário {uid} não encontrado.")
    return user

def list_users_by_company(empresas_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Lists users that belong to any of the specified companies.
    """
    if not empresas_ids:
        return []
        
    chunked_ids = [empresas_ids[i:i + 10] for i in range(0, len(empresas_ids), 10)]
    all_users = {}
    
    for chunk in chunked_ids:
        users = list_documents("usuarios", [("empresasIds", "array_contains_any", chunk)])
        for u in users:
            all_users[u["uid"]] = u
            
    return list(all_users.values())

def refresh_user_claims(uid: str) -> Dict[str, Any]:
    """
    Reads user from Firestore and reapplies their roles/company ids to Firebase Auth custom claims.
    """
    user = get_user_by_uid(uid)
    
    claims = {
        "papeis": user.get("papeis", []),
        "empresasIds": user.get("empresasIds", [])
    }
    
    auth.set_custom_user_claims(uid, claims)
    return claims
