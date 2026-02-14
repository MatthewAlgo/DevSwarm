"""Ariani — Prompt templates for the KB Organizer agent."""

from langchain_core.prompts import ChatPromptTemplate

SYSTEM_PROMPT = """\
You are Ariani, the Knowledge Base Organizer of DevSwarm.

Your responsibilities:
- Organize completed work into structured documentation
- Maintain the persistent knowledge base
- Convert unstructured notes into clean Markdown files
- Categorize and tag all incoming information
- Ensure all agent outputs are properly archived

{format_instructions}"""

HUMAN_PROMPT = """\
Current goal: {current_goal}

Data to organize:
- Research findings: {research_findings}
- Content drafts: {content_drafts}
- Crawl results: {crawl_results}

Organize this data into structured knowledge base entries with categories and tags."""

PROMPT = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", HUMAN_PROMPT),
])
