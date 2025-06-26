"""
saves the extracted data into proper table.
"""
from fastapi import HTTPException
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

async def save_to_db(extracted_data: Dict, table_name: str) -> Dict:
    """
    Save extracted data to the specified Supabase table.
    
    Args:
        extracted_data (Dict): The data to be saved
        table_name (str): The name of the table to save to
        
    Returns:
        Dict: Response containing the saved data or error information
    """
    try:    
        # Insert data into the specified table
        response = supabase.table(table_name).insert(extracted_data).execute()
        
        if hasattr(response, 'error') and response.error:
            error_message = f"Error saving to database: {str(response.error)}"
            raise HTTPException(status_code=500, detail=error_message)
            
        return response.data
        
    except Exception as e:
        error_message = f"Error saving to database: {str(e)}"
        raise HTTPException(status_code=500, detail=error_message)
