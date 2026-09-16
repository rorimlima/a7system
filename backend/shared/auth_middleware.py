"""
Authentication and authorization middleware using Firebase Auth.
"""
from typing import List, Optional, Callable
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from shared.jwt_auth import decode_access_token
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
    """Validate JWT access token and return decoded token data."""
    token = credentials.credentials
    try:
        decoded_token = decode_access_token(token)
        return decoded_token
    except Exception as e:
        raise ForbiddenError(f"Invalid authentication token: {str(e)}")

def get_current_user(
    request: Request,
    decoded_token: dict = Depends(verify_token)
) -> UserContext:
    """Extract user information from the decoded token."""
    uid = decoded_token.get("uid") or decoded_token.get("sub", "")
    email = decoded_token.get("email", "")
    
    # Custom claims
    papeis = decoded_token.get("papeis", [])
    empresas_ids = decoded_token.get("empresasIds", [])
    if isinstance(empresas_ids, str):
        empresas_ids = [empresas_ids]
    
    # Anti-IDOR: capture active company from header if provided
    empresa_ativa = request.headers.get("X-Empresa-ID") or request.headers.get("x-empresa-id")
    if empresa_ativa and empresas_ids and empresa_ativa not in empresas_ids:
        if "master" not in papeis:
            raise ForbiddenError("User does not have access to the requested company.")
    if not empresa_ativa and empresas_ids:
        empresa_ativa = empresas_ids[0]
        
    return UserContext(
        uid=str(uid),
        email=email,
        papeis=papeis if isinstance(papeis, list) else [papeis],
        empresasIds=empresas_ids if isinstance(empresas_ids, list) else [empresas_ids],
        empresa_ativa=str(empresa_ativa) if empresa_ativa else None
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

# Alias for compatibility
require_roles = require_role

