"""Hindsight Memory Service for VendorPulse.

Encapsulates official Hindsight Python SDK client integration,
memory retention, contextual memory recall, and deterministic
offline mock fallback store.
"""

from typing import Any, Dict, List, Optional
import logging
import re

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from hindsight_client import Hindsight

    HINDSIGHT_SDK_AVAILABLE = True
except ImportError:
    Hindsight = None
    HINDSIGHT_SDK_AVAILABLE = False


class HindsightService:
    """Service wrapping Hindsight Memory SDK with mock fallback support."""

    def __init__(
        self,
        api_url: Optional[str] = None,
        api_key: Optional[str] = None,
        bank_id: Optional[str] = None,
        mock_mode: Optional[bool] = None,
    ):
        self.api_url = api_url or settings.HINDSIGHT_API_URL
        self.api_key = api_key or settings.HINDSIGHT_API_KEY
        self.bank_id = bank_id or settings.HINDSIGHT_BANK_ID

        self.mock_mode = (
            mock_mode
            if mock_mode is not None
            else settings.HINDSIGHT_MOCK_MODE
        )

        self._client = None
        self._mock_memories: List[Dict[str, Any]] = []

        if (
            not self.mock_mode
            and HINDSIGHT_SDK_AVAILABLE
            and self.api_key
        ):
            try:
                self._client = Hindsight(
                    base_url=self.api_url,
                    api_key=self.api_key,
                )

                logger.info(
                    "Hindsight Cloud client initialized successfully "
                    "for bank '%s'.",
                    self.bank_id,
                )

            except Exception as err:
                logger.warning(
                    "Failed to initialize live Hindsight SDK client: %s. "
                    "Falling back to mock mode.",
                    err,
                )
                self.mock_mode = True
        else:
            self.mock_mode = True

    # ------------------------------------------------------------------
    # Metadata helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _stringify_metadata(
        metadata: Optional[Dict[str, Any]],
    ) -> Dict[str, str]:
        """Convert metadata values to strings for Hindsight Cloud."""

        if not metadata:
            return {}

        return {
            str(key): str(value)
            for key, value in metadata.items()
            if value is not None
        }

    # ------------------------------------------------------------------
    # Vendor validation
    # ------------------------------------------------------------------

    @staticmethod
    def _vendor_in_text(
        memory_text: str,
        vendor_name: str,
    ) -> bool:
        """Check whether the requested vendor is actually named in memory."""

        if not memory_text or not vendor_name:
            return False

        pattern = (
            r"(?<![a-z0-9])"
            + re.escape(vendor_name.strip().lower())
            + r"(?![a-z0-9])"
        )

        return re.search(
            pattern,
            memory_text.lower(),
        ) is not None

    @staticmethod
    def _build_recall_item(
        item: Any,
        requested_vendor: str,
        requested_category: Optional[str],
    ) -> Dict[str, Any]:
        """Normalize one Hindsight recall result."""

        text = str(
            getattr(item, "text", "") or ""
        )

        metadata = getattr(
            item,
            "metadata",
            {},
        ) or {}

        if not isinstance(metadata, dict):
            metadata = {}

        relevance_score = 0.85

        scores = getattr(
            item,
            "scores",
            None,
        )

        if scores is not None:
            for field_name in (
                "overall",
                "semantic",
                "relevance",
            ):
                value = getattr(
                    scores,
                    field_name,
                    None,
                )

                if value is not None:
                    try:
                        relevance_score = float(value)
                        break
                    except (
                        TypeError,
                        ValueError,
                    ):
                        pass

        return {
            # IMPORTANT:
            # The requested vendor is authoritative. Do not expose
            # potentially incorrect Hindsight vendor metadata as the
            # vendor identity used by the agent.
            "vendor_name": requested_vendor,
            "po_id": metadata.get(
                "po_id",
                "N/A",
            ),
            "category": metadata.get(
                "category",
                requested_category or "General",
            ),
            "text": text,
            "relevance_score": relevance_score,
            "metadata": metadata,
        }

    # ------------------------------------------------------------------
    # Experience retention
    # ------------------------------------------------------------------

    def retain_purchase_experience(
        self,
        vendor_name: str,
        po_id: str,
        category: str,
        experience_text: str,
        metadata: Optional[Dict[str, Any]] = None,
        is_synthetic_context: bool = True,
    ) -> bool:
        """Retain one procurement experience in Hindsight."""

        if not experience_text:
            return False

        raw_metadata: Dict[str, Any] = {
            "vendor_name": vendor_name,
            "po_id": po_id,
            "category": category,
            "is_synthetic_context": is_synthetic_context,
            **(metadata or {}),
        }

        memory_item = {
            "vendor_name": vendor_name,
            "po_id": po_id,
            "category": category,
            "text": experience_text,
            "metadata": raw_metadata,
        }

        if self.mock_mode or not self._client:
            self._mock_memories.append(memory_item)

            logger.info(
                "[Mock Hindsight] Retained memory for vendor '%s' "
                "in bank '%s'",
                vendor_name,
                self.bank_id,
            )

            return True

        cloud_metadata = self._stringify_metadata(
            raw_metadata
        )

        try:
            response = self._client.retain(
                bank_id=self.bank_id,
                content=experience_text,
                metadata=cloud_metadata,
            )

            return bool(
                getattr(
                    response,
                    "success",
                    True,
                )
            )

        except Exception as err:
            logger.error(
                "Hindsight retain API error: %s",
                err,
            )
            return False

    async def retain_purchase_experience_async(
        self,
        vendor_name: str,
        po_id: str,
        category: str,
        experience_text: str,
        metadata: Optional[Dict[str, Any]] = None,
        is_synthetic_context: bool = True,
    ) -> bool:
        """Async-safe Hindsight retention."""

        if not experience_text:
            return False

        raw_metadata: Dict[str, Any] = {
            "vendor_name": vendor_name,
            "po_id": po_id,
            "category": category,
            "is_synthetic_context": is_synthetic_context,
            **(metadata or {}),
        }

        memory_item = {
            "vendor_name": vendor_name,
            "po_id": po_id,
            "category": category,
            "text": experience_text,
            "metadata": raw_metadata,
        }

        if self.mock_mode or not self.api_key:
            self._mock_memories.append(memory_item)

            logger.info(
                "[Mock Hindsight] Retained async memory for vendor '%s' "
                "in bank '%s'",
                vendor_name,
                self.bank_id,
            )

            return True

        cloud_metadata = self._stringify_metadata(
            raw_metadata
        )

        client = None

        try:
            client = Hindsight(
                base_url=self.api_url,
                api_key=self.api_key,
            )

            response = await client.aretain(
                bank_id=self.bank_id,
                content=experience_text,
                metadata=cloud_metadata,
            )

            return bool(
                getattr(
                    response,
                    "success",
                    True,
                )
            )

        except Exception as err:
            logger.error(
                "Hindsight async retain API error: %s",
                err,
            )
            return False

        finally:
            if client is not None:
                try:
                    await client.aclose()
                except Exception as close_err:
                    logger.warning(
                        "Failed to close temporary Hindsight client: %s",
                        close_err,
                    )

    # ------------------------------------------------------------------
    # Recall
    # ------------------------------------------------------------------

    def recall_vendor_experience(
        self,
        vendor_name: str,
        query: str,
        category: Optional[str] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Recall vendor history with narrative-level vendor validation."""

        if top_k <= 0 or not vendor_name:
            return []

        # --------------------------------------------------------------
        # MOCK MODE
        # --------------------------------------------------------------

        if self.mock_mode or not self._client:
            results: List[Dict[str, Any]] = []

            vendor_clean = vendor_name.strip().lower()

            cat_clean = (
                category.strip().lower()
                if category
                else None
            )

            query_clean = (
                query.strip().lower()
                if query
                else ""
            )

            for mem in self._mock_memories:
                m_vendor = (
                    mem["vendor_name"]
                    .strip()
                    .lower()
                )

                m_category = (
                    mem["category"]
                    .strip()
                    .lower()
                )

                m_text = mem["text"].lower()

                match_score = 0.0

                if m_vendor == vendor_clean:
                    match_score += 0.5

                if (
                    cat_clean
                    and m_category == cat_clean
                ):
                    match_score += 0.3

                if query_clean:
                    query_terms = [
                        term
                        for term in query_clean.split()
                        if len(term) > 3
                    ]

                    if any(
                        term in m_text
                        for term in query_terms
                    ):
                        match_score += 0.2

                if match_score > 0.3:
                    results.append(
                        {
                            "vendor_name": mem["vendor_name"],
                            "po_id": mem["po_id"],
                            "category": mem["category"],
                            "text": mem["text"],
                            "relevance_score": round(
                                match_score,
                                2,
                            ),
                            "metadata": mem["metadata"],
                        }
                    )

            results.sort(
                key=lambda item: item["relevance_score"],
                reverse=True,
            )

            return results[:top_k]

        # --------------------------------------------------------------
        # REAL HINDSIGHT CLOUD
        # --------------------------------------------------------------

        try:
            search_query = (
                f"{vendor_name} "
                f"{category or ''} "
                f"{query}"
            ).strip()

            response = self._client.recall(
                bank_id=self.bank_id,
                query=search_query,
            )

            items = getattr(
                response,
                "results",
                [],
            ) or []

            recalled_list: List[Dict[str, Any]] = []

            # IMPORTANT:
            # Do NOT slice items before filtering.
            # Hindsight may return mismatched metadata in the first
            # semantic results. We need to scan all returned candidates
            # and only then enforce top_k.
            for item in items:
                text = str(
                    getattr(
                        item,
                        "text",
                        "",
                    ) or ""
                )

                if not self._vendor_in_text(
                    text,
                    vendor_name,
                ):
                    continue

                recalled_list.append(
                    self._build_recall_item(
                        item,
                        vendor_name,
                        category,
                    )
                )

                if len(recalled_list) >= top_k:
                    break

            return recalled_list

        except Exception as err:
            logger.error(
                "Hindsight recall API error: %s",
                err,
            )
            return []

    async def recall_vendor_experience_async(
        self,
        vendor_name: str,
        query: str,
        category: Optional[str] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Async-safe recall using a client bound to the current event loop."""

        if top_k <= 0 or not vendor_name:
            return []

        if self.mock_mode or not self.api_key:
            return self.recall_vendor_experience(
                vendor_name=vendor_name,
                query=query,
                category=category,
                top_k=top_k,
            )

        client = None

        try:
            client = Hindsight(
                base_url=self.api_url,
                api_key=self.api_key,
            )

            search_query = (
                f"{vendor_name} "
                f"{category or ''} "
                f"{query}"
            ).strip()

            response = await client.arecall(
                bank_id=self.bank_id,
                query=search_query,
            )

            items = getattr(
                response,
                "results",
                [],
            ) or []

            recalled_list: List[Dict[str, Any]] = []

            for item in items:
                text = str(
                    getattr(
                        item,
                        "text",
                        "",
                    ) or ""
                )

                if not self._vendor_in_text(
                    text,
                    vendor_name,
                ):
                    continue

                recalled_list.append(
                    self._build_recall_item(
                        item,
                        vendor_name,
                        category,
                    )
                )

                if len(recalled_list) >= top_k:
                    break

            return recalled_list

        except Exception as err:
            logger.error(
                "Hindsight async recall API error: %s",
                err,
            )
            return []

        finally:
            if client is not None:
                try:
                    await client.aclose()
                except Exception as close_err:
                    logger.warning(
                        "Failed to close temporary Hindsight recall client: %s",
                        close_err,
                    )

    # ------------------------------------------------------------------
    # Procurement outcomes
    # ------------------------------------------------------------------

    @staticmethod
    def _build_outcome(
        vendor_name: str,
        po_id: str,
        category: str,
        outcome_summary: str,
        delay_days: int = 0,
        defect_rate: float = 0.0,
        delay_reason: Optional[str] = None,
        vendor_explanation: Optional[str] = None,
        resolution: Optional[str] = None,
        additional_cost: float = 0.0,
    ):
        """Build procurement outcome narrative and metadata."""

        narrative_parts = [
            (
                f"Procurement outcome for Vendor "
                f"{vendor_name} on Purchase Request/PO "
                f"{po_id} (Category: {category})."
            ),
            (
                f"Fulfillment Status Summary: "
                f"{outcome_summary}."
            ),
        ]

        if delay_days > 0:
            narrative_parts.append(
                f"Order experienced a delivery delay "
                f"of {delay_days} days."
            )

            if delay_reason:
                narrative_parts.append(
                    f"Delay Root Cause: "
                    f"{delay_reason}."
                )

        if defect_rate > 0:
            narrative_parts.append(
                "Quality inspection recorded defect "
                f"rate of "
                f"{round(defect_rate * 100, 2)}%."
            )

        if vendor_explanation:
            narrative_parts.append(
                f"Vendor Explanation: "
                f"{vendor_explanation}."
            )

        if resolution:
            narrative_parts.append(
                f"Resolution / Action Taken: "
                f"{resolution}."
            )

        if additional_cost > 0:
            narrative_parts.append(
                f"Additional Financial Impact: "
                f"${additional_cost:,.2f}."
            )

        experience_narrative = " ".join(
            narrative_parts
        )

        metadata = {
            "delay_days": delay_days,
            "defect_rate": defect_rate,
            "additional_cost": additional_cost,
            "outcome_type": (
                "post_fulfillment_recorded_outcome"
            ),
        }

        return experience_narrative, metadata

    def retain_procurement_outcome(
        self,
        vendor_name: str,
        po_id: str,
        category: str,
        outcome_summary: str,
        delay_days: int = 0,
        defect_rate: float = 0.0,
        delay_reason: Optional[str] = None,
        vendor_explanation: Optional[str] = None,
        resolution: Optional[str] = None,
        additional_cost: float = 0.0,
    ) -> bool:
        """Synchronous procurement outcome retention."""

        experience_narrative, metadata = self._build_outcome(
            vendor_name=vendor_name,
            po_id=po_id,
            category=category,
            outcome_summary=outcome_summary,
            delay_days=delay_days,
            defect_rate=defect_rate,
            delay_reason=delay_reason,
            vendor_explanation=vendor_explanation,
            resolution=resolution,
            additional_cost=additional_cost,
        )

        return self.retain_purchase_experience(
            vendor_name=vendor_name,
            po_id=po_id,
            category=category,
            experience_text=experience_narrative,
            metadata=metadata,
            is_synthetic_context=False,
        )

    async def retain_procurement_outcome_async(
        self,
        vendor_name: str,
        po_id: str,
        category: str,
        outcome_summary: str,
        delay_days: int = 0,
        defect_rate: float = 0.0,
        delay_reason: Optional[str] = None,
        vendor_explanation: Optional[str] = None,
        resolution: Optional[str] = None,
        additional_cost: float = 0.0,
    ) -> bool:
        """Async-safe procurement outcome retention."""

        experience_narrative, metadata = self._build_outcome(
            vendor_name=vendor_name,
            po_id=po_id,
            category=category,
            outcome_summary=outcome_summary,
            delay_days=delay_days,
            defect_rate=defect_rate,
            delay_reason=delay_reason,
            vendor_explanation=vendor_explanation,
            resolution=resolution,
            additional_cost=additional_cost,
        )

        return await self.retain_purchase_experience_async(
            vendor_name=vendor_name,
            po_id=po_id,
            category=category,
            experience_text=experience_narrative,
            metadata=metadata,
            is_synthetic_context=False,
        )

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Close the persistent synchronous Hindsight client."""

        if self._client is not None:
            try:
                self._client.close()
            except Exception as err:
                logger.warning(
                    "Failed to close Hindsight client: %s",
                    err,
                )
            finally:
                self._client = None


hindsight_service = HindsightService()
