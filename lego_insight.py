import os
from dotenv import load_dotenv
from agent import handle_query

load_dotenv()

queries = [
    "Top 10 expensive lego star wars set"
]

for query in queries:
    print(f"Query: {query}")
    response = handle_query(query)
    print(f"Response: {response}\n")