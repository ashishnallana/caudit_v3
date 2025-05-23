"""
saves the extracted data into proper table.
"""
from typing import Dict, List
import os
from supabase import create_client, Client
from dotenv import load_dotenv

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
            return {
                "success": False,
                "error": str(response.error),
                "data": None
            }
            
        return {
            "success": True,
            "data": response.data,
            "error": None
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": None
        }