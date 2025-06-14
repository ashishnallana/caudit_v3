"""
saves the extracted data into proper table.
"""
from typing import Dict, List
import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_KEY", "")
supabase = create_client(supabase_url, supabase_key)

async def save_to_db(user_id: str, extracted_data: Dict, table_name: str) -> Dict:
    """
    Save extracted data to the specified Supabase table.
    
    Args:
        user_id (str): The ID of the user (should match auth.uid())
        extracted_data (Dict): The data to be saved
        table_name (str): The name of the table to save to
        
    Returns:
        Dict: Response containing the saved data or error information
    """
    try:
        # Add user_id to the data if not present
        if 'user_id' not in extracted_data:
            extracted_data['user_id'] = user_id
            
        # Insert data into the specified table
        response = supabase.table(table_name).insert(extracted_data).execute()
        
        if hasattr(response, 'error') and response.error:
            error_message = str(response.error)
            # If this is a document_jobs table save, update the status to failed
            if table_name == "document_jobs":
                await update_job_status(extracted_data.get('job_id'), error_message)
            return {
                "success": False,
                "error": error_message,
                "data": None
            }
            
        return {
            "success": True,
            "data": response.data,
            "error": None
        }
        
    except Exception as e:
        error_message = str(e)
        # If this is a document_jobs table save, update the status to failed
        if table_name == "document_jobs":
            await update_job_status(extracted_data.get('job_id'), error_message)
        return {
            "success": False,
            "error": error_message,
            "data": None
        }

async def update_job_status(job_id: str, error_message: str) -> None:
    """
    Helper function to update job status to failed with error message
    """
    try:
        supabase.table("document_jobs").update({
            "status": "failed",
            "error_message": error_message,
            "last_run_at": datetime.utcnow().isoformat()
        }).eq('id', job_id).execute()
    except Exception:
        # If this fails, we can't do much more
        pass