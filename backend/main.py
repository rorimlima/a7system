"""
Main entry point for the A7SYSTEM FastAPI application.
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from shared.firebase_init import initialize_firebase
from shared.errors import A7SystemError, setup_exception_handlers

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the FastAPI application."""
    # Initialize Firebase Admin
    initialize_firebase()
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

# Setup global exception handlers
setup_exception_handlers(app)

@app.get("/api/health", tags=["Health"])
def health_check() -> dict:
    """Health check endpoint to verify API status."""
    return {"status": "ok", "version": "1.0.0"}

# Include routers
# from routers import auth, companies, products, purchases, sales, crm, dashboard
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
# app.include_router(products.router, prefix="/api/products", tags=["Products"])
# app.include_router(purchases.router, prefix="/api/purchases", tags=["Purchases"])
# app.include_router(sales.router, prefix="/api/sales", tags=["Sales"])
# app.include_router(crm.router, prefix="/api/crm", tags=["CRM"])
# app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
