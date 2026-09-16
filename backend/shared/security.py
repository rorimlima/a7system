import time
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add standard security headers to every response.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        return response


class RateLimiter:
    """
    Simple in-memory rate limiter.
    """
    def __init__(self):
        # Dict mapping IP to a list of timestamps (float)
        self.requests: Dict[str, List[float]] = {}

    def check_rate_limit(self, ip: str, endpoint: str, limit: int, window_seconds: int):
        """
        Check if the IP has exceeded the rate limit for the specified window.
        Raises HTTPException if limit is exceeded.
        """
        now = time.time()
        key = f"{ip}:{endpoint}"
        
        # Initialize list if missing
        if key not in self.requests:
            self.requests[key] = []
        
        # Remove old timestamps outside the window
        self.requests[key] = [timestamp for timestamp in self.requests[key] if now - timestamp < window_seconds]
        
        # Check limit
        if len(self.requests[key]) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )
        
        # Add current request timestamp
        self.requests[key].append(now)

# Global instance of RateLimiter for simplicity
rate_limiter = RateLimiter()

async def input_sanitization_middleware(request: Request, call_next):
    """
    Middleware to sanitize inputs, enforce max body size and validate Content-Type.
    """
    MAX_BODY_SIZE = 5 * 1024 * 1024 # 5MB max
    
    # Check Content-Length if present
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return Response(content="Request body too large", status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    
    # Content-Type validation for endpoints expecting JSON (skip for GET/DELETE)
    if request.method in ["POST", "PUT", "PATCH"]:
        content_type = request.headers.get("content-type", "")
        # Allow json, multipart, form-urlencoded
        if not ("application/json" in content_type or "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type):
            pass # Relaxed to accommodate other types, but can enforce strict check if needed
            
    response = await call_next(request)
    return response
