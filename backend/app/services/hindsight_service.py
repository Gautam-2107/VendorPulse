"""Hindsight Memory Service for VendorPulse.

Provides:
- Hindsight Cloud retention
- Hindsight Cloud recall
- vendor/category-aware memory filtering
- async-safe recall/retention
- procurement outcome retention
- deterministic mock fallback
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
    """Service wrapper around the official Hindsight SDK."""

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
                    "Hindsight Cloud client initialized for bank '%s'.",
                    self.bank_id,
                )

            except Exception as err:
                logger.warning(
                    "Failed to initialize Hindsight Cloud: %s",
                    err,
                )
                self.mock_mode = True
        else:
            self.mock_mode = True

    # ================================================================
    # Helpers
    # ================================================================

    @staticmethod
    def _stringify_metadata(
        metadata: Optional[Dict[str, Any]],
    ) -> Dict[str, str]:
        if not metadata:
            return {}

        return {
            str(key): str(value)
            for key, value in metadata.items()
            if value is not None
        }

    @staticmethod
    def _normalise(value: Any) -> str:
        return str(value or "").strip().lower()

    @staticmethod
    def _vendor_in_text(
        memory_text: str,
        vendor_name: str,
    ) -> bool:
        """Return True when the vendor name appears in memory text."""

        if not memory_text or not vendor_name:
            return False

        pattern = (
            r"(?<![a-z0-9])"
            + re.escape(vendor_name.strip().lower())
            + r"(?![a-z0-9])"
        )

        return (
            re.search(
                pattern,
                memory_text.lower(),
            )
            is not None
        )

    @staticmethod
    def _category_in_text(
        memory_text: str,
        category: Optional[str],
    ) -> bool:
        """Return True when category/material appears in memory text."""

        if not memory_text or not category:
            return False

        return category.strip().lower() in memory_text.lower()

    @staticmethod
    def _get_item_text(item: Any) -> str:
        """Support different Hindsight SDK result object shapes."""

        text = getattr(item, "text", None)

        if text:
            return str(text)

        content = getattr(item, "content", None)

        if content:
            return str(content)

        if isinstance(item, dict):
            return str(
                item.get("text")
                or item.get("content")
                or ""
            )

        return ""

    @staticmethod
    def _get_item_metadata(item: Any) -> Dict[str, Any]:
        """Safely extract metadata from SDK result."""

        metadata = getattr(
            item,
            "metadata",
            None,
        )

        if metadata is None and isinstance(item, dict):
            metadata = item.get("metadata")

        if not isinstance(metadata, dict):
            return {}

        return metadata

    @staticmethod
    def _get_item_score(item: Any) -> float:
        """Extract relevance score from different SDK response shapes."""

        # Direct score
        score = getattr(
            item,
            "score",
            None,
        )

        if score is None and isinstance(item, dict):
            score = item.get("score")

        if score is not None:
            try:
                return float(score)
            except (
                TypeError,
                ValueError,
            ):
                pass

        # Nested scores
        scores = getattr(
            item,
            "scores",
            None,
        )

        if scores is None and isinstance(item, dict):
            scores = item.get("scores")

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

                if value is None and isinstance(
                    scores,
                    dict,
                ):
                    value = scores.get(field_name)

                if value is not None:
                    try:
                        return float(value)
                    except (
                        TypeError,
                        ValueError,
                    ):
                        pass

        return 0.85

    @staticmethod
    def _extract_items(response: Any) -> List[Any]:
        """Normalize Hindsight recall response."""

        if response is None:
            return []

        if isinstance(response, list):
            return response

        for attr in (
            "results",
            "memories",
            "items",
        ):
            value = getattr(
                response,
                attr,
                None,
            )

            if value is not None:
                return list(value or [])

        if isinstance(response, dict):
            for key in (
                "results",
                "memories",
                "items",
            ):
                if key in response:
                    return list(
                        response.get(key)
                        or []
                    )

        return []

    @classmethod
    def _build_recall_item(
        cls,
        item: Any,
        requested_vendor: str,
        requested_category: Optional[str],
    ) -> Dict[str, Any]:
        """Normalize a Hindsight memory result."""

        text = cls._get_item_text(item)

        metadata = cls._get_item_metadata(item)

        return {
            # Requested vendor remains authoritative.
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
            "relevance_score": cls._get_item_score(item),
            "metadata": metadata,
        }

    # ================================================================
    # Retention
    # ================================================================

    def retain_purchase_experience(
        self,
        vendor_name: str,
        po_id: str,
        category: str,
        experience_text: str,
        metadata: Optional[Dict[str, Any]] = None,
        is_synthetic_context: bool = True,
    ) -> bool:
        """Retain one procurement experience."""

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
            self._mock_memories.append(
                memory_item
            )

            logger.info(
                "[Mock Hindsight] Retained memory for '%s'.",
                vendor_name,
            )

            return True

        try:
            response = self._client.retain(
                bank_id=self.bank_id,
                content=experience_text,
                metadata=self._stringify_metadata(
                    raw_metadata
                ),
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
            self._mock_memories.append(
                memory_item
            )

            return True

        client = None

        try:
            client = Hindsight(
                base_url=self.api_url,
                api_key=self.api_key,
            )

            response = await client.aretain(
                bank_id=self.bank_id,
                content=experience_text,
                metadata=self._stringify_metadata(
                    raw_metadata
                ),
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
                except Exception:
                    pass

    # ================================================================
    # Recall
    # ================================================================

    def recall_vendor_experience(
        self,
        vendor_name: str,
        query: str,
        category: Optional[str] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Recall relevant memories for one vendor.

        A memory is accepted when:
        - vendor metadata matches, OR
        - vendor name appears in memory text.

        Category/material matching is also checked when possible.
        """

        if (
            top_k <= 0
            or not vendor_name
        ):
            return []

        # ------------------------------------------------------------
        # MOCK MODE
        # ------------------------------------------------------------

        if self.mock_mode or not self._client:
            results: List[Dict[str, Any]] = []

            vendor_clean = self._normalise(
                vendor_name
            )

            category_clean = self._normalise(
                category
            )

            query_clean = self._normalise(
                query
            )

            query_terms = [
                term
                for term in query_clean.split()
                if len(term) > 3
            ]

            for mem in self._mock_memories:
                mem_vendor = self._normalise(
                    mem.get("vendor_name")
                )

                mem_category = self._normalise(
                    mem.get("category")
                )

                mem_text = self._normalise(
                    mem.get("text")
                )

                if mem_vendor != vendor_clean:
                    continue

                score = 0.5

                if (
                    category_clean
                    and mem_category
                    == category_clean
                ):
                    score += 0.3

                if query_terms and any(
                    term in mem_text
                    for term in query_terms
                ):
                    score += 0.2

                results.append(
                    {
                        "vendor_name": vendor_name,
                        "po_id": mem.get(
                            "po_id",
                            "N/A",
                        ),
                        "category": mem.get(
                            "category",
                            category or "General",
                        ),
                        "text": mem.get(
                            "text",
                            "",
                        ),
                        "relevance_score": round(
                            score,
                            2,
                        ),
                        "metadata": mem.get(
                            "metadata",
                            {},
                        ),
                    }
                )

            results.sort(
                key=lambda item: item[
                    "relevance_score"
                ],
                reverse=True,
            )

            return results[:top_k]

        # ------------------------------------------------------------
        # REAL HINDSIGHT CLOUD
        # ------------------------------------------------------------

        try:
            # Multiple focused queries improve recall for newly-created
            # requests while still using Hindsight semantic retrieval.
            queries = []

            if vendor_name and category:
                queries.append(
                    f"{vendor_name} {category}"
                )

            if vendor_name and query:
                queries.append(
                    f"{vendor_name} {query}"
                )

            if vendor_name:
                queries.append(
                    vendor_name
                )

            # Remove duplicate queries.
            unique_queries = list(
                dict.fromkeys(
                    q.strip()
                    for q in queries
                    if q.strip()
                )
            )

            collected: List[
                Dict[str, Any]
            ] = []

            seen = set()

            for search_query in unique_queries:
                try:
                    response = self._client.recall(
                        bank_id=self.bank_id,
                        query=search_query,
                    )

                    items = self._extract_items(
                        response
                    )

                    for item in items:
                        text = self._get_item_text(
                            item
                        )

                        metadata = (
                            self._get_item_metadata(
                                item
                            )
                        )

                        requested_vendor = (
                            self._normalise(
                                vendor_name
                            )
                        )

                        metadata_vendor = (
                            self._normalise(
                                metadata.get(
                                    "vendor_name"
                                )
                            )
                        )

                        # IMPORTANT:
                        # Hindsight metadata is authoritative when
                        # it explicitly identifies this vendor.
                        vendor_matches = (
                            metadata_vendor
                            == requested_vendor
                            or self._vendor_in_text(
                                text,
                                vendor_name,
                            )
                        )

                        if not vendor_matches:
                            continue

                        # If metadata contains an explicit category,
                        # require it to match the requested category.
                        metadata_category = (
                            self._normalise(
                                metadata.get(
                                    "category"
                                )
                            )
                        )

                        requested_category = (
                            self._normalise(
                                category
                            )
                        )

                        if (
                            metadata_category
                            and requested_category
                            and metadata_category
                            != requested_category
                        ):
                            # The text can still rescue the result
                            # if the requested material/category is
                            # explicitly mentioned.
                            if not self._category_in_text(
                                text,
                                category,
                            ):
                                continue

                        memory = (
                            self._build_recall_item(
                                item,
                                vendor_name,
                                category,
                            )
                        )

                        # Deduplicate using memory text + PO.
                        dedupe_key = (
                            memory["po_id"],
                            memory["text"].strip().lower(),
                        )

                        if dedupe_key in seen:
                            continue

                        seen.add(
                            dedupe_key
                        )

                        collected.append(
                            memory
                        )

                except Exception as query_err:
                    logger.warning(
                        "Hindsight recall query failed "
                        "for '%s': %s",
                        search_query,
                        query_err,
                    )

            collected.sort(
                key=lambda item: item[
                    "relevance_score"
                ],
                reverse=True,
            )

            return collected[:top_k]

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
        """Async-safe Hindsight recall."""

        if (
            top_k <= 0
            or not vendor_name
        ):
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

            queries = []

            if vendor_name and category:
                queries.append(
                    f"{vendor_name} {category}"
                )

            if vendor_name and query:
                queries.append(
                    f"{vendor_name} {query}"
                )

            if vendor_name:
                queries.append(
                    vendor_name
                )

            unique_queries = list(
                dict.fromkeys(
                    q.strip()
                    for q in queries
                    if q.strip()
                )
            )

            collected = []
            seen = set()

            for search_query in unique_queries:
                response = await client.arecall(
                    bank_id=self.bank_id,
                    query=search_query,
                )

                items = self._extract_items(
                    response
                )

                for item in items:
                    text = self._get_item_text(
                        item
                    )

                    metadata = (
                        self._get_item_metadata(
                            item
                        )
                    )

                    requested_vendor = (
                        self._normalise(
                            vendor_name
                        )
                    )

                    metadata_vendor = (
                        self._normalise(
                            metadata.get(
                                "vendor_name"
                            )
                        )
                    )

                    vendor_matches = (
                        metadata_vendor
                        == requested_vendor
                        or self._vendor_in_text(
                            text,
                            vendor_name,
                        )
                    )

                    if not vendor_matches:
                        continue

                    memory = (
                        self._build_recall_item(
                            item,
                            vendor_name,
                            category,
                        )
                    )

                    dedupe_key = (
                        memory["po_id"],
                        memory["text"].strip().lower(),
                    )

                    if dedupe_key in seen:
                        continue

                    seen.add(
                        dedupe_key
                    )

                    collected.append(
                        memory
                    )

            collected.sort(
                key=lambda item: item[
                    "relevance_score"
                ],
                reverse=True,
            )

            return collected[:top_k]

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
                except Exception:
                    pass

    # ================================================================
    # Procurement outcomes
    # ================================================================

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
        """Build procurement outcome narrative."""

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
                f"rate of {round(defect_rate * 100, 2)}%."
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

        return (
            experience_narrative,
            metadata,
        )

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
        """Synchronously retain a procurement outcome."""

        experience_narrative, metadata = (
            self._build_outcome(
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

        experience_narrative, metadata = (
            self._build_outcome(
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
        )

        return await self.retain_purchase_experience_async(
            vendor_name=vendor_name,
            po_id=po_id,
            category=category,
            experience_text=experience_narrative,
            metadata=metadata,
            is_synthetic_context=False,
        )

    # ================================================================
    # Lifecycle
    # ================================================================

    def close(self) -> None:
        """Close persistent Hindsight client."""

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
