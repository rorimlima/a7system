"""
Custom exception classes and global error handlers for FastAPI.
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class A7SystemError(Exception):
    """Base exception class for A7SYSTEM."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class NotFoundError(A7SystemError):
    """Resource not found (404)."""
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)

class ForbiddenError(A7SystemError):
    """Access denied (403)."""
    def __init__(self, message: str = "Access forbidden"):
        super().__init__(message, status_code=403)

class ValidationError(A7SystemError):
    """Validation or unprocessable entity (422)."""
    def __init__(self, message: str = "Validation failed"):
        super().__init__(message, status_code=422)

class ConflictError(A7SystemError):
    """Resource conflict (409)."""
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message, status_code=409)

class InsufficientStockError(ValidationError):
    """Insufficient stock for operation (422)."""
    def __init__(self, message: str = "Insufficient stock available"):
        super().__init__(message)

def setup_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers for the FastAPI app."""
    
    @app.exception_handler(A7SystemError)
    async def a7system_error_handler(request: Request, exc: A7SystemError):
        logger.warning(f"A7SystemError: {exc.message} on {request.url}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": True, "message": exc.message, "type": exc.__class__.__name__}
        )
        
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled Exception: {str(exc)} on {request.url}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": True, "message": "Internal server error"}
        )
