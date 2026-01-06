import os
import sys
from dotenv import load_dotenv
from agent import handle_query, chat_history

os.environ["TOKENIZERS_PARALLELISM"] = "false"

load_dotenv()

def main():
    print("Lego Query Bot - Type your query below")
    print("   (type 'exit' or press Ctrl+D/Ctrl+C to quit)\n")
    
    while True:
        try:
            query = input("➤  ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n\nSee you later!")
            sys.exit(0)
        
        if not query:
            continue
            
        if query.lower() in {"exit", "quit", "q", ":q"}:
            print("Goodbye!")
            break
            
        print(f"\nQuery: {query}")
        try:
            response = handle_query(query)
            print(f"Response: {response}\n")
        except Exception as e:
            print(f"Error: {e}\n")

if __name__ == "__main__":
    main()