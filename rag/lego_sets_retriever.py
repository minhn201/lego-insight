from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from pathlib import Path
import csv
import json

DATA_DIR = Path(__file__).parent / "data"
SETS_CSV = DATA_DIR / "enriched.csv"
VECTORSTORE_PATH = DATA_DIR / "faiss_lego_sets"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

def build_lego_sets_vectorstore():
    documents = []

    with open(SETS_CSV, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            set_num = row["set_num"]
            name = row["set_name"]
            year = row["year"]
            num_parts = row["num_parts"]
            theme = row["theme"]
            themeGroup = row["themeGroup"]
            subtheme = row["subtheme"]
            agerange_min = row["agerange_min"]
            


            content = f"{name} | Set Number: {set_num} | Number of parts: {num_parts} | Year: {year} | Theme: {theme} | Group Theme: {themeGroup} | Sub theme: {subtheme} | Age: {agerange_min}"

            documents.append(Document(
                page_content=content,
                metadata={
                    "set_num": set_num,
                    "name": name,
                    "year": year,
                    "num_parts": num_parts,
                    "theme": theme,
                    "themeGroup": themeGroup,
                    "subtheme": subtheme,
                    "agerange_min": agerange_min
                }
            ))

        vectorstore = FAISS.from_documents(
            documents,
            HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        )

        vectorstore.save_local(VECTORSTORE_PATH)
        return vectorstore
    
def load_lego_sets_retriever():
    if VECTORSTORE_PATH.exists():
        vectorstore = FAISS.load_local(
            VECTORSTORE_PATH,
            HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL),
            allow_dangerous_deserialization=True
        )
        
    return build_lego_sets_vectorstore()
    

        