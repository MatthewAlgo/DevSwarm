"""
Agent Output Schemas — Pydantic models for structured LLM output.
Used by PydanticOutputParser in each agent's LangChain chain.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# --- Marco (CEO / Orchestrator) ---

class SubtaskAssignment(BaseModel):
    """A single task delegation from Marco to a specialist agent."""

    agent: str = Field(description="Agent ID to delegate to (e.g. 'jimmy', 'mona', 'dan')")
    task: str = Field(description="Clear description of the subtask to execute")
    priority: int = Field(default=3, ge=1, le=5, description="Priority 1-5 (5=highest)")


class MarcoRoutingOutput(BaseModel):
    """Marco's task decomposition and delegation plan."""

    analysis: str = Field(description="Brief analysis of the goal and required expertise")
    subtasks: list[SubtaskAssignment] = Field(
        default_factory=list,
        description="List of subtask assignments to specialist agents",
    )
    meeting_required: bool = Field(
        default=False, description="Whether a cross-agent meeting is needed"
    )
    meeting_agents: list[str] = Field(
        default_factory=list,
        description="Agent IDs to include in the meeting (if meeting_required)",
    )


# --- Jimmy (Content Crawler) ---

class CrawlFinding(BaseModel):
    """A single finding from Jimmy's web crawl."""

    topic: str = Field(description="Topic name or headline")
    summary: str = Field(description="Key findings summary")
    sources: list[str] = Field(default_factory=list, description="Source URLs")
    relevance_score: int = Field(default=5, ge=1, le=10, description="Relevance 1-10")
    tags: list[str] = Field(default_factory=list, description="Topic tags")


class JimmyCrawlOutput(BaseModel):
    """Jimmy's structured crawl results."""

    findings: list[CrawlFinding] = Field(default_factory=list)
    next_crawl_focus: str = Field(
        default="", description="Suggested focus area for next crawl cycle"
    )


# --- Mona Lisa (Deep Researcher) ---

class MonaResearchOutput(BaseModel):
    """Mona Lisa's structured research report."""

    title: str = Field(description="Research report title")
    executive_summary: str = Field(description="Brief overview of findings")
    key_findings: list[str] = Field(default_factory=list, description="List of key findings")
    data_sources: list[str] = Field(default_factory=list, description="Sources consulted")
    recommendations: list[str] = Field(default_factory=list, description="Actionable recommendations")
    confidence_level: str = Field(
        default="medium", description="Confidence: high/medium/low"
    )


# --- Dan (Viral Engineer) ---

class ContentDraft(BaseModel):
    """A single content draft from Dan."""

    platform: str = Field(description="Target platform: twitter/linkedin/blog")
    content: str = Field(description="The actual content text")
    hashtags: list[str] = Field(default_factory=list, description="Relevant hashtags")
    engagement_prediction: str = Field(
        default="medium", description="Predicted engagement: high/medium/low"
    )
    call_to_action: str = Field(default="", description="Optional CTA")


class DanContentOutput(BaseModel):
    """Dan's structured content creation output."""

    topic: str = Field(description="Topic the content is about")
    drafts: list[ContentDraft] = Field(default_factory=list)
    sentiment_analysis: str = Field(default="", description="Overall sentiment assessment")


# --- Tonny (Comms Interface) ---

class CommItem(BaseModel):
    """A single communication item processed by Tonny."""

    type: str = Field(description="reply/newsletter/notification")
    to: str = Field(description="Recipient identifier")
    subject: str = Field(description="Email/message subject")
    body: str = Field(description="Email/message body content")
    priority: str = Field(default="normal", description="high/normal/low")


class TonnyCommsOutput(BaseModel):
    """Tonny's structured communications output."""

    processed: list[CommItem] = Field(default_factory=list)
    escalations: list[str] = Field(
        default_factory=list, description="Items escalated to Marco"
    )
    summary: str = Field(default="", description="Processing summary")


# --- Bob (DevOps Monitor) ---

class BobHealthOutput(BaseModel):
    """Bob's system health check report."""

    diagnosis: str = Field(description="Root cause analysis or system status")
    agents_online: int = Field(default=0, description="Number of online agents")
    agents_error: int = Field(default=0, description="Number of agents in error state")
    agents_recovered: int = Field(default=0, description="Number recovered this cycle")
    system_status: str = Field(default="healthy", description="healthy/recovering/critical")
    actions_taken: list[str] = Field(
        default_factory=list, description="Recovery actions performed"
    )


# --- Ariani (KB Organizer) ---

class KBEntry(BaseModel):
    """A single knowledge base entry organized by Ariani."""

    document_title: str = Field(description="Document title")
    category: str = Field(description="research/content/devops/general")
    tags: list[str] = Field(default_factory=list, description="Categorization tags")
    linked_agents: list[str] = Field(
        default_factory=list, description="Agent IDs who contributed"
    )


class ArianiKBOutput(BaseModel):
    """Ariani's knowledge base organization output."""

    entries_organized: int = Field(default=0, description="Number of entries processed")
    entries: list[KBEntry] = Field(default_factory=list)
    summary: str = Field(default="", description="Organization summary")


# --- Peter (Frontend Designer) ---

class PeterDesignOutput(BaseModel):
    """Peter's design output."""

    type: str = Field(description="mockup/asset/critique")
    description: str = Field(description="What was created or analyzed")
    design_notes: str = Field(description="Technical design notes")
    iterations: int = Field(default=1, description="Number of design iterations")
    approval_status: str = Field(
        default="draft", description="draft/review/approved"
    )
