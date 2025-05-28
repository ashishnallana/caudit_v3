from fastapi import APIRouter, HTTPException, Request
import os
from typing import Dict, List, Optional
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime
from pydantic import BaseModel
# from ..user_router import router

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_KEY", "")
supabase = create_client(supabase_url, supabase_key)

router = APIRouter()

class DateRange(BaseModel):
    start_date: str  # Format: YYYY-MM-DD
    end_date: Optional[str] = None  # Format: YYYY-MM-DD, defaults to current date

@router.post("/fetch-user-entries-between-dates")
async def fetch_user_entries_between_dates(date_range: DateRange, request: Request) -> Dict:
    """
    Fetch journal entries for the authenticated user between two dates from the Supabase database.
    If end_date is not provided, it defaults to the current date.
    """
    try:
        # Get the authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=401, detail="Authorization header is missing")

        # Extract the token from Bearer token
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header format. Must be 'Bearer <token>'")
        
        token = auth_header.split(" ")[1]

        # Verify the user and get their ID
        response = supabase.auth.get_user(token)
        user_id = response.user.id

        # Validate date format for start_date
        try:
            start_date = datetime.strptime(date_range.start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")

        # Set end_date to current date if not provided
        end_date = date_range.end_date
        if end_date is None:
            end_date = datetime.now().strftime("%Y-%m-%d")
        else:
            try:
                datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")

        # Fetch entries for the user between the specified dates
        entries = supabase.table("journal_entries") \
            .select("*") \
            .eq("user_id", user_id) \
            .gte("entry_date", date_range.start_date) \
            .lte("entry_date", end_date) \
            .order("entry_date", desc=True) \
            .execute()

        if hasattr(entries, 'error') and entries.error:
            raise HTTPException(status_code=500, detail=str(entries.error))

        return {
            "success": True,
            "user": response.user,
            "data": entries.data,
            "error": None
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user entries: {str(e)}")
