"""
LLM Factory — Centralized model instantiation for all agents.
Uses ChatGoogleGenerativeAI from langchain-google-genai.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI

logger = logging.getLogger("devswarm.core.llm")

# Default model configuration
DEFAULT_MODEL = "gemini-3-flash-preview"
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 4096


@lru_cache(maxsize=4)
def get_llm(
    model: str = DEFAULT_MODEL,
    temperature: float = DEFAULT_TEMPERATURE,
    max_output_tokens: int = DEFAULT_MAX_TOKENS,
) -> ChatGoogleGenerativeAI:
    """
    Get a cached LLM instance. Uses lru_cache so identical configs
    share the same client, reducing connection overhead.

    Requires GOOGLE_API_KEY environment variable.
    """
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        logger.warning("GOOGLE_API_KEY not set — LLM calls will fail")

    llm = ChatGoogleGenerativeAI(
        model=model,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        google_api_key=api_key,
    )
    logger.info(f"LLM initialized: {model} (temp={temperature})")
    return llm
