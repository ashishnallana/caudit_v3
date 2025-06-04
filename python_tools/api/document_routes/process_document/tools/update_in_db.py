"""
Updates existing data in the specified table.
"""
from typing import Dict
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_KEY", "")
supabase = create_client(supabase_url, supabase_key)

async def update_in_db(item_id: str, updated_data: Dict, table_name: str) -> Dict:
    """
    Update existing data in the specified Supabase table.
    
    Args:
        item_id (str): The ID of the item to update
        updated_data (Dict): The data to be updated
        table_name (str): The name of the table to update
        
    Returns:
        Dict: Response containing the updated data or error information
    """
    try:
        # Update data in the specified table
        response = supabase.table(table_name).update(updated_data).eq('id', item_id).execute()
        
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