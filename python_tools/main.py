from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.extract_document import router as document_router
from api.process_document import router as process_router

app = FastAPI(title="Document Processing API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/")
async def root():
    return {"message": "API is running"}

# Include the routers
app.include_router(document_router)
app.include_router(process_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload
        reload_dirs=["api", "tools"]  # Watch these directories for changes
    ) 