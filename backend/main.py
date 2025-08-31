from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db, engine, Base
from app.routers import auth, sessions, compute, graph, export, stats, units
from app.config import settings

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Scientific Calculator API",
    description="Backend API for Advanced Scientific Calculator",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(compute.router, prefix="/api/compute", tags=["Compute"])
app.include_router(graph.router, prefix="/api/graph", tags=["Graph"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])
app.include_router(units.router, prefix="/api/units", tags=["Units"])


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )