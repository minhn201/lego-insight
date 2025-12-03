import os
from dotenv import load_dotenv
from agent import handle_query

load_dotenv()

queries = [
    "Give me a detail summary of customer reviews of set 75391-1"
]

for query in queries:
    print(f"Query: {query}")
    response = handle_query(query)
    print(f"Response: {response}\n")