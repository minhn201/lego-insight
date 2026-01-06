import sys, os
import re

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT_DIR)

from langchain.tools import tool
from rag.lego_sets_retriever import load_lego_sets_retriever
import json


vectorstore = load_lego_sets_retriever()
retriever = vectorstore.as_retriever(search_kwargs={"k": 50})

@tool
def resolve_lego_set(query: str) -> str:
    """
    You are expected to use use this tool first to obtain basic information about set. 
    Use the returned set number for more details from other functions.
    LEGO set resolver with pre-FAISS lexical fallback.
    Priority:
    1) Lexical match (name + year)
    2) Deterministic ranking
    3) FAISS semantic fallback
    """

    query_clean = query.lower().replace("#", "").strip()
    tokens = query_clean.split()

    # -----------------------
    # Extract year
    # -----------------------
    requested_year = None
    for t in tokens:
        if t.isdigit() and len(t) == 4:
            requested_year = t
            break

    # Name tokens (ignore digits)
    name_tokens = [t for t in tokens if not t.isdigit()]

    def lexical_match(doc):
        meta = doc.metadata
        name = meta.get("name", "").lower()
        subtheme = meta.get("subtheme", "").lower()
        content = f"{name} {subtheme}"

        if requested_year and str(meta.get("year")) != requested_year:
            return False

        return all(t in content for t in name_tokens)

    # -----------------------
    # 1️⃣ LEXICAL SCAN (ALL DOCS)
    # -----------------------
    try:
        all_docs = vectorstore.docstore._dict.values()
    except Exception:
        all_docs = []

    lexical_hits = [doc for doc in all_docs if lexical_match(doc)]

    # -----------------------
    # 2️⃣ FALLBACK TO FAISS
    # -----------------------
    if not lexical_hits:
        lexical_hits = retriever.invoke(query, k=50)

    # -----------------------
    # RANKING
    # -----------------------
    ranked = []

    for doc in lexical_hits:
        meta = doc.metadata
        name = meta.get("name", "").lower()
        subtheme = meta.get("subtheme", "").lower()

        score = 0

        # Exact phrase match
        if " ".join(name_tokens) in name:
            score += 300

        # Token matches
        score += sum(1 for t in name_tokens if t in name) * 50

        # Penalize promos
        if subtheme in ("promotional", "magazine gift"):
            score -= 300

        # Prefer large sets
        try:
            score += min(int(meta.get("num_parts", 0)) / 1000, 100)
        except:
            pass

        ranked.append((score, doc))

    ranked.sort(key=lambda x: x[0], reverse=True)

    results = []
    for score, doc in ranked[:10]:
        meta = doc.metadata
        results.append({
            "set_num": meta.get("set_num"),
            "name": meta.get("name"),
            "year": meta.get("year"),
            "num_parts": meta.get("num_parts"),
            "theme": meta.get("theme"),
            "themeGroup": meta.get("themeGroup"),
            "subtheme": meta.get("subtheme"),
            "agerange_min": meta.get("agerange_min"),
            "score": round(score, 2)
        })

    return json.dumps({
        "query": query,
        "candidates": results
    }, indent=2)

if __name__ == "__main__":
    tests = ["Venator", "Millenium Falcon UCS and Venator 2026", "Hogwarts Castle", "Titanic"]
    for q in tests:
        print(f"\n→ {q}")
        print(resolve_lego_set.invoke({"query": q}))