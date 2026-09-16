"""
Auth middleware compatibility module.
Provides get_current_user_with_roles for routes expecting it.
"""
from typing import List, Callable
from fastapi import Depends, HTTPException
from shared.auth_middleware import get_current_user, UserContext, require_role

def get_current_user_with_roles(allowed_roles: List[str]) -> Callable:
    def checker(user: UserContext = Depends(get_current_user)) -> dict:
        if not any(role in user.papeis for role in allowed_roles) and "master" not in user.papeis:
            raise HTTPException(status_code=403, detail="Permissão insuficiente.")
        return {
            "uid": user.uid,
            "email": user.email,
            "papeis": user.papeis,
            "empresasIds": user.empresasIds,
            "empresa_ativa": user.empresa_ativa
        }
    return checker
