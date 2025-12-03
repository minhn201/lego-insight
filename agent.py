import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain.agents import create_tool_calling_agent, AgentExecutor
from tools.rebrickable_tool import rebrickable_set_tool, rebrickable_minifigs_tool, rebrickable_colors_tool, rebrickable_parts_tool
from tools.brickset_tool import brickset_get_sets_tool, brickset_get_reviews_tool, brickset_get_themes_tool

# Use variables from .env
load_dotenv()

# Initialize Groq model
llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY")
)

# Define system prompt
prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a LEGO expert. Use Rebrickable for set details, minifigs, colors, and parts lists"),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}")
    ]
)

# Create agent with tools
tools = [
    rebrickable_set_tool,
    rebrickable_minifigs_tool,
    rebrickable_colors_tool,
    rebrickable_parts_tool,
    brickset_get_sets_tool,
    brickset_get_reviews_tool,
    brickset_get_themes_tool
]

agent = create_tool_calling_agent(llm, tools, prompt)
agent_exectutor = AgentExecutor(agent=agent, tools=tools, verbose=True)

def handle_query(query: str) -> str:
    try:
        result = agent_exectutor.invoke({"input": query})
        return result["output"]
    except Exception as e:
        return f"Error: {str(e)}"