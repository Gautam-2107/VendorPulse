"""Groq LLM Provider abstraction for VendorPulse."""

import json
import logging
from typing import Any, Dict, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from groq import Groq
    GROQ_SDK_AVAILABLE = True
except ImportError:
    GROQ_SDK_AVAILABLE = False


class LLMProvider:
    """Abstraction layer for Groq LLM inference with mock fallback for tests."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or settings.LLM_MODEL
        self._client = None

        if GROQ_SDK_AVAILABLE and self.api_key:
            try:
                self._client = Groq(api_key=self.api_key)
            except Exception as err:
                logger.warning(f"Failed to initialize Groq client: {err}. Using mock mode.")

    def generate_analysis(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.0,
    ) -> str:
        """Generates text completion using Groq LLM or deterministic fallback mock."""
        if not self._client:
            # Deterministic mock response for offline development / unit tests
            return (
                "Based on baseline metrics and recalled historical Hindsight memories, "
                "the candidate vendor demonstrates strong recent reliability despite past seasonal delays."
            )

        sys_msg = system_prompt or "You are VendorPulse, an expert AI procurement vendor risk assistant."

        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": sys_msg},
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
            )
            return response.choices[0].message.content.strip()
        except Exception as err:
            logger.error(f"Groq API completion error: {err}")
            return (
                f"Analysis completed with baseline metrics fallback (LLM provider note: {err})."
            )


llm_provider = LLMProvider()
