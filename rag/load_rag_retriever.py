from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
import pickle
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
VECTORSTORE_PATH = DATA_DIR/ "fass_api_docs"

def load_rag_retriever():
    if VECTORSTORE_PATH.exists():
        vectorstore = FAISS.load_local(
            VECTORSTORE_PATH,
            HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2"),
            allow_dangerous_deserialization=True
        )
        print("FAISS Loaded")
    else:
        from langchain_community.document_loaders import TextLoader
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        print("Building API docs vectorstore...")
        loader1 = TextLoader(DATA_DIR / "rebrickable_api_doc.html")
        loader2 = TextLoader(DATA_DIR / "brickset_api_doc.html")

        docs = loader1.load() + loader2.load()

        for doc in docs:
            source = doc.metadata["source"]
            doc.metadata["api"] = "Rebrickable" if "rebrickable" in source else "Brickset"

        splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=150)
        chunks = splitter.split_documents(docs)

        vectorstore = FAISS.from_documents(chunks, HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2"))
        vectorstore.save_local(VECTORSTORE_PATH)

        print(f"Dave new FAISS index to {VECTORSTORE_PATH}")

    return vectorstore.as_retriever(search_kwargs={"k":6})