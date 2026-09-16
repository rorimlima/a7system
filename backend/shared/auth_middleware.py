"""
Authentication and authorization middleware using Firebase Auth.
"""
from typing import List, Optional, Callable
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from shared.firebase_init import get_auth_client
from shared.errors import ForbiddenError, A7SystemError

security = HTTPBearer()

class UserContext(BaseModel):
    """Context object representing the authenticated user."""
    uid: str
    email: str
    papeis: List[str]
    empresasIds: List[str]
    empresa_ativa: Optional[str] = None

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Validate Firebase ID token and return decoded token data."""
    token = credentials.credentials
    auth_client = get_auth_client()
    try:
        decoded_token = auth_client.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise ForbiddenError(f"Invalid authentication token: {str(e)}")

def get_current_user(
    request: Request,
    decoded_token: dict = Depends(verify_token)
) -> UserContext:
    """Extract user information from the decoded token."""
    uid = decoded_token.get("uid", "")
    email = decoded_token.get("email", "")
    
    # Custom claims
    papeis = decoded_token.get("papeis", [])
    empresas_ids = decoded_token.get("empresasIds", [])
    
    # Anti-IDOR: capture active company from header if provided, validate against claims
    empresa_ativa = request.headers.get("X-Empresa-ID")
    if empresa_ativa and empresa_ativa not in empresas_ids:
        raise ForbiddenError("User does not have access to the requested company.")
        
    return UserContext(
        uid=uid,
        email=email,
        papeis=papeis if isinstance(papeis, list) else [papeis],
        empresasIds=empresas_ids if isinstance(empresas_ids, list) else [empresas_ids],
        empresa_ativa=empresa_ativa
    )

def require_role(*roles: str) -> Callable:
    """Dependency factory to ensure the user has at least one of the required roles."""
    def role_checker(current_user: UserContext = Depends(get_current_user)) -> UserContext:
        if not current_user.papeis:
            raise ForbiddenError("User has no roles assigned.")
        if not any(role in current_user.papeis for role in roles):
            raise ForbiddenError("User lacks required roles.")
        return current_user
    return role_checker

def require_company(empresa_id: str, current_user: UserContext = Depends(get_current_user)) -> UserContext:
    """Dependency to ensure the user has access to a specific company."""
    if empresa_id not in current_user.empresasIds:
        raise ForbiddenError(f"Access denied to company {empresa_id}.")
    return current_user
