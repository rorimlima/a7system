"""
Main entry point for the A7SYSTEM FastAPI application.
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from shared.database import engine
from sqlalchemy import text
from shared.errors import A7SystemError, setup_exception_handlers
from shared.security import SecurityHeadersMiddleware, input_sanitization_middleware, rate_limiter

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the FastAPI application."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[DATABASE] Conectado ao PostgreSQL (Supabase) com sucesso!")
    except Exception as e:
        print(f"[DATABASE] Falha ao conectar ao PostgreSQL: {e}")
    yield

# Create FastAPI application
app = FastAPI(
    title="A7SYSTEM API",
    version="1.0.0",
    description="Backend API for the A7SYSTEM platform",
    lifespan=lifespan,
)

# Setup CORS middleware
cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup Security middlewares
app.add_middleware(SecurityHeadersMiddleware)

# Add input sanitization as base http middleware
app.middleware("http")(input_sanitization_middleware)

# Setup global exception handlers
setup_exception_handlers(app)

@app.get("/api/health", tags=["Health"])
def health_check() -> dict:
    """Health check endpoint to verify API status."""
    return {"status": "ok", "version": "1.0.0"}

# Rate limiting dependency for auth
def auth_rate_limit(request: Request):
    client_ip = request.client.host if request.client else "127.0.0.1"
    rate_limiter.check_rate_limit(client_ip, request.url.path, limit=10, window_seconds=60)

# Include routers
from auth.routes import router as auth_router
from companies.routes import router as companies_router
from companies.fornecedores_routes import router as fornecedores_router
from companies.clientes_routes import router as clientes_router
from products.routes import router as products_router
from products.estoque_routes import router as estoque_router
from purchases.routes import router as purchases_router
from purchases.parcelas_routes import router as parcelas_router

# Inject rate limit dependency into auth router
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"], dependencies=[Depends(auth_rate_limit)])
app.include_router(companies_router, prefix="/api/companies", tags=["Companies"])
app.include_router(fornecedores_router, prefix="/api/fornecedores", tags=["Fornecedores"])
app.include_router(clientes_router, prefix="/api/clientes", tags=["Clientes"])
app.include_router(products_router, prefix="/api/products", tags=["Products"])
app.include_router(estoque_router, prefix="/api/estoque", tags=["Estoque"])
app.include_router(purchases_router, prefix="/api/purchases", tags=["Purchases"])
app.include_router(parcelas_router, prefix="/api/parcelas", tags=["Contas a Pagar"])

from sales.routes import router as sales_router
from crm.routes import router as crm_router
from dashboard.routes import router as dashboard_router

app.include_router(sales_router, prefix="/api/sales", tags=["Sales"])
app.include_router(crm_router, prefix="/api/crm", tags=["CRM"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])

from fastapi.staticfiles import StaticFiles

# Uploads locais
uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Compartilhados do frontend
frontend_shared = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "shared"))
if os.path.exists(frontend_shared):
    app.mount("/shared", StaticFiles(directory=frontend_shared), name="shared")

# SPA do Frontend
frontend_app = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "app"))
if os.path.exists(frontend_app):
    app.mount("/", StaticFiles(directory=frontend_app, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
