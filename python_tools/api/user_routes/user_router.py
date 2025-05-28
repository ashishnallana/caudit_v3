from fastapi import APIRouter

router = APIRouter(prefix="/api/user", tags=["entries"])

from .fetch_user_entries.fetch_user_entries import router as fetch_user_entries
from .fetch_user_entries_between_dates.fetch_user_entries_between_dates import router as fetch_user_entries_between_dates
router.include_router(fetch_user_entries)
router.include_router(fetch_user_entries_between_dates)