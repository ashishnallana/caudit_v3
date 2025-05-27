from fastapi import APIRouter, HTTPException, Request
import os
from typing import Dict, List
from supabase import create_client, Client
from dotenv import load_dotenv
from ..user_router import router

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_KEY", "")
supabase = create_client(supabase_url, supabase_key)

router = APIRouter()

@router.get("/fetch-user-entries")
async def fetch_user_entries(request: Request) -> Dict:
    """
    Fetch all journal entries for the authenticated user from the Supabase database
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

        # Fetch all entries for the user from the journal_entries table
        entries = supabase.table("journal_entries") \
            .select("*") \
            .eq("user_id", user_id) \
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
