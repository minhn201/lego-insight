import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.messages import HumanMessage, AIMessage

from tools.rebrickable_tool import rebrickable_set_tool, rebrickable_minifigs_tool, rebrickable_colors_tool, rebrickable_parts_tool
from tools.brickset_tool import brickset_get_sets_tool, brickset_get_reviews_tool, brickset_get_themes_tool
from tools.lego_sets_resolver import resolve_lego_set
from langchain.tools import tool, StructuredTool

from rag.load_rag_retriever import load_rag_retriever

# Use variables from .env
load_dotenv()

chat_history = []

retriver = load_rag_retriever()

@tool
def lookup_api_documentation(query:str) -> str:
    """
    Use this tool when you need to understand how a Rebrickable or Brickset API endpoint works, 
    what paramenters it accepts, or what response format is.

    Ignore endpoints that are not avaiblable in this implemenation.
    """
    docs = retriver.invoke(query)
    return "\n\n".join([f"[{doc.metadata.get('api', 'Unknown')}] {doc.page_content}" for doc in docs])


# Initialize Groq model
llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY")
)

# Access prompt file 
with open("system_prompt_template.txt", "r", encoding="utf-8") as f:
    system_prompt_text = f.read().strip()


# Define system prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt_text),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder("agent_scratchpad"),
])

# Create agent with tools
tools = [
    rebrickable_set_tool,
    rebrickable_minifigs_tool,
    rebrickable_colors_tool,
    rebrickable_parts_tool,
    brickset_get_sets_tool,
    brickset_get_reviews_tool,
    brickset_get_themes_tool,
    resolve_lego_set,
    lookup_api_documentation
]

agent = create_tool_calling_agent(llm, tools, prompt)
agent_exectutor = AgentExecutor(
    agent=agent, 
    tools=tools, 
    verbose=False,
    handle_parsing_errors=True)

def handle_query(query: str, history: list = None) -> str:
    global chat_history
    if history is not None:
        current_history = history
    else:
        current_history = chat_history

    try:
        result = agent_exectutor.invoke({"input": query,
                                         "chat_history": current_history})
        
        assistance_message = result["output"]

        # Append to history
        if history is None:
            chat_history.append(HumanMessage(content=query))
            chat_history.append(AIMessage(content=assistance_message))

        return assistance_message
    
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        if history is None:
            chat_history.append(HumanMessage(content=query))
            chat_history.append(AIMessage(content=error_msg))
        return f"Error: {str(e)}"

