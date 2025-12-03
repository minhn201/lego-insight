import os
import json
import requests
from typing import Any, Dict
from typing import Literal
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

def _get_hash() -> str:
    api_key = os.getenv("BRICKSET_KEY")
    url = "https://brickset.com/api/v3.asmx/login"

    query = {
        "apiKey": api_key,
        "username": os.getenv("BRICKSET_USERNAME"),
        "password": os.getenv("BRICKSET_PASSWORD")
    }

    try:
        resp = requests.get(url, params=query, timeout=12)
        resp.raise_for_status()
        data = resp.json()
        return data.get("hash", "")
    except requests.RequestException as e:
        return f"Error calling Brickset login: {e}"
    
# Helper to build params dict
def _build_params_dict(**kwargs) -> Dict[str, Any]:
    return {k: v for k, v in kwargs.items() if v is not None}

def _call_brickset(method: str, **extra) -> str:
    api_key = os.getenv("BRICKSET_KEY")
    params_payload = _build_params_dict(**extra)
    set_id = None

    if method == "getReviews":
        if "setID" not in params_payload and "setNumber" in params_payload:
            set_number = params_payload.pop("setNumber")
            sets_result = _call_brickset("getSets", setNumber=set_number, pageSize=1)
            try:
                sets_data = json.loads(sets_result)
                if not sets_data or len(sets_data) == 0:
                    return json.dumps({"error": f"No set found for setNumber: {set_number}"})
                set_id = sets_data[0].get("setID")
                if set_id is None:
                    return json.dumps({"error": f"setID not found for setNumber: {set_number}"})
                params_payload["setID"] = set_id
                print(f"SET_ID: {set_id}")
            except (json.JSONDecodeError, KeyError, IndexError) as e:
                return json.dumps({"error": f"Failed to fetch setID for {set_number}: {e}"})
        elif "setID" not in params_payload:
            return json.dumps({"error": "setID is required for getReviews (or provide setNumber to auto-fetch)"})
    
    url = f"https://brickset.com/api/v3.asmx/{method}"
    query = {
        "apiKey": api_key,
    }

    if method == "getSets":
        query["username"] = os.getenv("BRICKSET_USERNAME")
        query["password"] = os.getenv("BRICKSET_PASSWORD")
        query["params"] = json.dumps(params_payload)
    if method == "getReviews":
        query["setID"] = set_id

    if "userHash" in params_payload:
        query["userHash"] = params_payload["userHash"]

    if method in {"getSets"}:
        query["userHash"] = _get_hash()

    print(f"QUERY: {query}")

    try:
        resp = requests.get(url, params=query, timeout=12)
        resp.raise_for_status()
        data = resp.json()

        if method == "getSets":
            return json.dumps(data.get("sets", []), indent=2, ensure_ascii=False)
        if method == "getReviews":
            return json.dumps(data.get("reviews", []), indent=2, ensure_ascii=False)
        if method == "getThemes":
            return json.dumps(data.get("themes", []), indent=2, ensure_ascii=False)
        return json.dumps(data, indent=2, ensure_ascii=False)

    except requests.RequestException as e:
        return json.dumps({"error": f"Error calling Brickset {method}: {e}"})

class GetSetsInput(BaseModel):
    """Inputs for getSets: Search for LEGO sets by theme, year, set number, etc."""
    setNumber: Optional[str] = Field(default=None, description="e.g. 75192-1")
    setID: Optional[int] = Field(default=None, description="Brickset internal ID (e.g. 47231)")
    theme: Optional[str] = Field(default=None, description="e.g. Star Wars")
    year: Optional[str] = Field(default=None, description="e.g. 2017 or 1999-2019")
    pageSize: Optional[int] = Field(default=100, description="Max results per page (default 100)")
    orderBy: Optional[str] = Field(default=None, description="e.g. RatingDESC, YearDESC")
    extendedData: Optional[int] = Field(default=0, description="1 = include extra fields like images")

class GetReviewsInput(BaseModel):
    """Inputs for getReviews: Fetch reviews for a specific set."""
    setNumber: Optional[str] = Field(default=None, description="e.g. 75192-1 (auto-fetches setID)")
    setID: Optional[int] = Field(default=None, description="Brickset internal ID (e.g. 47231)")

class GetThemesInput(BaseModel):
    """Inputs for getThemes: List all themes (no params needed)."""
    pass

brickset_get_sets_tool = StructuredTool.from_function(
    func=lambda **kwargs: _call_brickset("getSets", **kwargs),
    name="brickset_get_sets",
    description="Search for LEGO sets by theme, year, set number, etc. Returns JSON list of matching sets.",
    args_schema=GetSetsInput,
)

brickset_get_reviews_tool = StructuredTool.from_function(
    func=lambda **kwargs: _call_brickset("getReviews", **kwargs),
    name="brickset_get_reviews",
    description="Fetch reviews for a LEGO set by setID or setNumber (auto-fetches setID if needed). Returns JSON list of reviews.",
    args_schema=GetReviewsInput,
)

brickset_get_themes_tool = StructuredTool.from_function(
    func=lambda **kwargs: _call_brickset("getThemes", **kwargs),
    name="brickset_get_themes",
    description="List all LEGO themes. No params needed. Returns JSON list of themes.",
    args_schema=GetThemesInput,
)

"""
if __name__ == "__main__":
    print("=== Available Themes ===")
    themes_result = brickset_get_themes_tool.func()
    print(themes_result[:500])
        
    print("\n=== Star Wars Set by Number (for ID fetch test) ===")
    set_result = brickset_get_sets_tool.func(setNumber="75367-1")
    print(set_result)
    
    print("\n=== Reviews by Set Number (auto-fetch test) ===")
    reviews_result = brickset_get_reviews_tool.func(setNumber="75367-1")
    print(reviews_result)
"""
