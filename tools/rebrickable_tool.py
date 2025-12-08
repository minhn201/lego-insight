import os
from dotenv import load_dotenv
import requests
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

# Use variable from .env file.
load_dotenv()

class RebrickableInput(BaseModel):
    set_num: str = Field(description='LEGO set number (e.g., 75192-1)')

# Return info about a LEGO set given a set number
def fetch_rebrickable_set(set_num: str) -> str:
    url = f"https://rebrickable.com/api/v3/lego/sets/{set_num}/"
    headers = {'Authorization': f"key {os.getenv('REBRICKABLE_KEY')}"}

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status
        data = response.json()
        return str({
            "name": data["name"],
            "pieces": data["num_parts"],
            "year": data["year"],
            "image": data["set_img_url"]
        })
    except requests.RequestException as e:
        return f"Error: Falled to fetch set data - {str(e)}"
    
def fetch_rebrickable_minifigs(set_num: str) -> str:
    url = f"https://rebrickable.com/api/v3/lego/sets/{set_num}/minifigs/"
    headers = {"Authorization": f"key {os.getenv('REBRICKABLE_KEY')}"}
    try:
        response = requests.get(url, headers=headers, params={"page_size": 100})
        response.raise_for_status()
        minifigs = response.json()["results"]
        minifigs_list = [{"name": m["set_name"], "quantity": m["quantity"]} for m in minifigs]
        return str(minifigs_list)
    except requests.RequestException as e:
        return f"Error: Failed to fetch minifigs - {str(e)}"
    
def fetch_color_stats(set_num: str) -> str:
    url = f"https://rebrickable.com/api/v3/lego/sets/{set_num}/parts/"
    headers = {"Authorization": f"key {os.getenv('REBRICKABLE_KEY')}"}
    try:
        response = requests.get(url, headers=headers, params={"page_size": 1000})
        response.raise_for_status()
        parts = response.json()["results"]
        color_counts = {}
        for part in parts:
            color = part["color"]["name"]
            color_counts[color] = color_counts.get(color, 0) + part["quantity"]
        return str(color_counts) # Format {[Color Name]: [Count]}
    except requests.RequestException as e:
        return f"Error: Failed to fetch color stats - {str(e)}"

# This could be delayed until we implement file creation feature.
def fetch_parts_list(set_num: str) -> str:
    url = f"https://rebrickable.com/api/v3/lego/sets/{set_num}/parts/"
    headers = {"Authorization": f"key {os.getenv('REBRICKABLE_KEY')}"}
    try:
        response = requests.get(url, headers=headers, params={"page_size": 1000})
        response.raise_for_status()
        parts = response.json()["results"]
        output = ["part_num, name, quantity, color"]
        for part in parts:
            output.append(f"{part['part']['part_num']},\"{part['part']['name']}\",{part['quantity']},{part['color']['name']}")
        return "\n".join(output) # Simplified CSV for testing
    except requests.RequestException as e:
        return f"Error: Failed to fetch parts - {str(e)}"
    
rebrickable_set_tool = StructuredTool.from_function(
    func=fetch_rebrickable_set,
    name="rebrickable_set_lookup",
    description="Fetches LEGO set details (name, piece count, year, image).",
    args_schema=RebrickableInput
 )

rebrickable_minifigs_tool = StructuredTool.from_function(
    func=fetch_rebrickable_minifigs,
    name="rebrickable_minifigs_lookup",
    description="Fetches minifigures details for a LEGO set.",
    args_schema=RebrickableInput
)

rebrickable_colors_tool = StructuredTool.from_function(
    func=fetch_color_stats,
    name="rebrickable_color_stats",
    description="Fetches color distribution of parts in a LEGO set.",
    args_schema=RebrickableInput
)

rebrickable_parts_tool = StructuredTool.from_function(
    func=fetch_parts_list,
    name="rebrickable_parts_list",
    description="Fetches parts list for a LEGO set as a CSV. Not for looking up minifigs",
    args_schema=RebrickableInput
)

# Test
# print(fetch_rebrickable_set("75192-1"))
# print(fetch_rebrickable_minifigs("75192-1"))
# print(fetch_color_stats("75192-1"))
# print(fetch_parts_list("75192-1"))
