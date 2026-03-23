import asyncio
import os
import json
from dotenv import load_dotenv

# Load the updated .env file
load_dotenv()

from backend.tools.sanction_checker import check_sanctions

async def test_sanction_api():
    print(f"Using API Key: {os.getenv('OPENSANCTIONS_API_KEY')[:8]}...")
    
    # Test 1: Known clean entity
    print("\n--- Test 1: Clean Entity ---")
    res1 = await check_sanctions("MedEquip Solutions Pvt Ltd", directors=["Rajesh Kumar Sharma"])
    print(json.dumps(res1, indent=2))
    
    # Test 2: Known sanctioned entity (from our mock lists, let's see if OpenSanctions finds something similar, or we can use a famously sanctioned name)
    print("\n--- Test 2: Famous Sanctioned Individual ---")
    res2 = await check_sanctions("Oleg Deripaska") # Russian oligarch, widely sanctioned
    print(json.dumps(res2, indent=2))

if __name__ == "__main__":
    asyncio.run(test_sanction_api())
