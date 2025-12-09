import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import create_tool_calling_agent, AgentExecutor
from tools.rebrickable_tool import rebrickable_set_tool, rebrickable_minifigs_tool, rebrickable_colors_tool, rebrickable_parts_tool
from tools.brickset_tool import brickset_get_sets_tool, brickset_get_reviews_tool, brickset_get_themes_tool
from langchain.tools import tool, StructuredTool

from rag.load_rag_retriever import load_rag_retriever

# Use variables from .env
load_dotenv()

retriver = load_rag_retriever()

@tool
def lookup_api_documentation(query:str) -> str:
    """
    Use this tool when you need to understand how a Rebrickable or Brickset API endpoint works, 
    what paramenters it accepts, or what response format is.

    Ignore endpoints that are not avaiblable in this implemenation.
    """
    docs = retriver.invovke(query)
    return "\n\n".join([f"[{doc.metadata.get('api', 'Unknown')}] {doc.page_content}" for doc in docs])


# Initialize Groq model
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY")
)

# Define system prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are the ultimate LEGO data expert.
You have access to real Rebrickable and Brickset APIs via tools.
You also have full API documentation available via the 'lookup_api_documentation' tool.

Guidelines:
- Always prefer using the actual tools to get real data.
- If you're unsure which tool to use or what parameters it needs → call lookup_api_documentation first.
- Never guess parameters or endpoints.
- For general questions about sets, minifigs, parts, colors → use Rebrickable tools.
- For reviews, themes, or owned/wanted stats → use Brickset tools."""),
    MessagesPlaceholder("chat_history", optional=True),
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
    lookup_api_documentation
]

agent = create_tool_calling_agent(llm, tools, prompt)
agent_exectutor = AgentExecutor(
    agent=agent, 
    tools=tools, 
    verbose=True,
    handle_parsing_errors=True)

def handle_query(query: str) -> str:
    try:
        result = agent_exectutor.invoke({"input": query})
        return result["output"]
    except Exception as e:
        return f"Error: {str(e)}"