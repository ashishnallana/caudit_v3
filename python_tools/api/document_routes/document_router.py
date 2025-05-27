from fastapi import APIRouter

router = APIRouter(prefix="/api/document", tags=["document"])

# Import and include the extract_document route
from .extract_document.extract_document import router as extract_document
from .process_document.process_document import router as process_document
router.include_router(extract_document)
router.include_router(process_document)