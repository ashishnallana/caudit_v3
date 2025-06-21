"""
Identifies the final account type (trading ac, profit and loss ac, or balance sheet) from trial balance data.
"""
from typing import Dict
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # required, but unused
)

async def identify_final_account(trial_balance_data: Dict, job_id: str = None) -> Dict:
    """
    Identify the final account type from the trial balance data.
    Args:
        trial_balance_data (Dict): The trial balance data
        job_id (str, optional): The ID of the job for error tracking
    Returns:
        Dict: Classification result with account type
    """
    try:
        trial_balance_json = json.dumps(trial_balance_data)

        prompt = f"""
            Classify the following trial balance data into one of the following final accounts: 'trading_ac', 'profit_loss_ac', or 'balance_sheet'.
            
            data: {trial_balance_json}
            
            Respond in JSON format with the following key:
            {{
                \"final_account_type\": \"(string) one of: trading ac, profit and loss ac, balance sheet\"
            }}
            
            Only provide the JSON object as output.
        """

        response = client.chat.completions.create(
            model="llama3:latest",
            messages=[
                {
                    "role": "system",
                    "content": "You are a smart accountant. Your job is to classify trial balance data into the correct final account type."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            response_format={ "type": "json_object" }
        )

        result_json = response.choices[0].message.content
        data = json.loads(result_json)
        return {
            "success": True,
            "final_account_type": data.get("final_account_type"),
            "error": None
        }
    except Exception as e:
        error_message = str(e)
        return {
            "success": False,
            "final_account_type": None,
            "error": error_message
        }
