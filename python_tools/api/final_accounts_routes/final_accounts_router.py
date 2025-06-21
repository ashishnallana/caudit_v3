from fastapi import APIRouter, HTTPException, Request
import requests
import os
from typing import Dict
from pydantic import BaseModel, HttpUrl
from datetime import datetime
from .tools.identify import identify_final_account

router = APIRouter(prefix="/api", tags=["final-accounts"])

# supabase_url = os.getenv("SUPABASE_URL", "")
# supabase_key = os.getenv("SUPABASE_KEY", "")

class TrialBalanceAccount(BaseModel):
    account_name: str
    balance_amount: float
    last_updated_at: str

class TrialBalance(BaseModel):
    debit: list[TrialBalanceAccount]
    credit: list[TrialBalanceAccount]
    total_debit: float
    total_credit: float

class GenerateFinalAccountsRequest(BaseModel):
    trialBalance: TrialBalance  

@router.post("/generate-final-accounts")
async def generate_final_accounts(payload: GenerateFinalAccountsRequest, request: Request) -> Dict:
    """
    Process trial balance data and classify the trial balance entries into trading_ac, profit_and_loss_ac and balance_sheet
    """
    try:
        trial_balance_entries = payload.trialBalance.debit + payload.trialBalance.credit
        # For each entry, call the identify tool
        classifications = []
        
        trading_ac_entries = []
        pl_ac_entries = []
        balance_sheet_entries = []

        for entry in trial_balance_entries:
            # Convert the entry to dict if it's a Pydantic model
            print("👉")
            entry_dict = entry.model_dump() if hasattr(entry, 'model_dump') else dict(entry)
            classification = await identify_final_account(entry_dict)
            classifications.append({
                "entry": entry_dict,
                "classification": classification
            })

        return {
            "success": True,
            "message": "Trial balance entries classified successfully",
            "classifications": classifications,
            "data": trial_balance_entries
        }
    
    except Exception as e:
        error_message = str(e)
        print(f"Error processing final accounts: {error_message}")
        raise HTTPException(status_code=500, detail=f"Error processing final accounts: {error_message}")
