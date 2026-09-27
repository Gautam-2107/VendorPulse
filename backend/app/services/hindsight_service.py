"""Hindsight Memory Service for VendorPulse.

Encapsulates official Hindsight Python SDK client integration, memory retention,
contextual memory recall, and deterministic offline mock fallback store.
"""

from typing import Any, Dict, List, Optional
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from hindsight_client import Hindsight
    HINDSIGHT_SDK_AVAILABLE = True
except ImportError:
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
        self.mock_mode = mock_mode if mock_mode is not None else settings.HINDSIGHT_MOCK_MODE

        self._client = None
        self._mock_memories: List[Dict[str, Any]] = []

        if not self.mock_mode and HINDSIGHT_SDK_AVAILABLE and self.api_key:
            try:
                self._client = Hindsight(base_url=self.api_url, api_key=self.api_key)
            except Exception as err:
                logger.warning(f"Failed to initialize live Hindsight SDK client: {err}. Falling back to mock mode.")
                self.mock_mode = True
        else:
            self.mock_mode = True

    def retain_purchase_experience(
        self,
        vendor_name: str,
        po_id: str,
        category: str,
        experience_text: str,
        metadata: Optional[Dict[str, Any]] = None,
        is_synthetic_context: bool = True,
    ) -> bool:
        """Retains a single procurement experience memory into Hindsight."""
        if not experience_text:
            return False

        meta = {
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
            "metadata": meta,
        }

        if self.mock_mode or not self._client:
            self._mock_memories.append(memory_item)
            logger.info(f"[Mock Hindsight] Retained memory for vendor '{vendor_name}' in bank '{self.bank_id}'")
            return True

        try:
            # SDK Call to Hindsight Cloud
            self._client.retain(
                bank_id=self.bank_id,
                content=experience_text,
                metadata=meta,
            )
            return True
        except Exception as err:
            logger.error(f"Hindsight retain API error: {err}")
            return False

    def recall_vendor_experience(
        self,
        vendor_name: str,
        query: str,
        category: Optional[str] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Recalls relevant historical memories for a vendor from Hindsight."""
        if self.mock_mode or not self._client:
            # Mock recall filtering in-memory store
            results = []
            vendor_clean = vendor_name.strip().lower()
            cat_clean = category.strip().lower() if category else None
            query_clean = query.strip().lower() if query else ""

            for mem in self._mock_memories:
                m_v = mem["vendor_name"].strip().lower()
                m_c = mem["category"].strip().lower()
                m_text = mem["text"].lower()

                # Relevance scoring logic
                match_score = 0.0
                if m_v == vendor_clean:
                    match_score += 0.5
                if cat_clean and m_c == cat_clean:
                    match_score += 0.3
                if query_clean and any(q_term in m_text for q_term in query_clean.split() if len(q_term) > 3):
                    match_score += 0.2

                if match_score > 0.3:
                    results.append({
                        "vendor_name": mem["vendor_name"],
                        "po_id": mem["po_id"],
                        "category": mem["category"],
                        "text": mem["text"],
                        "relevance_score": round(match_score, 2),
                        "metadata": mem["metadata"],
                    })

            # Sort by relevance
            results.sort(key=lambda x: x["relevance_score"], reverse=True)
            return results[:top_k]

        try:
            # SDK Call to Hindsight Cloud
            search_query = f"{vendor_name} {category or ''} {query}".strip()
            recall_response = self._client.recall(
                bank_id=self.bank_id,
                query=search_query,
                top_k=top_k,
            )

            recalled_list = []
            # Standardize response structure from SDK
            if hasattr(recall_response, "memories"):
                items = recall_response.memories
            elif isinstance(recall_response, list):
                items = recall_response
            else:
                items = []

            for item in items:
                text = getattr(item, "content", str(item))
                meta = getattr(item, "metadata", {}) or {}
                score = getattr(item, "score", 0.85)

                recalled_list.append({
                    "vendor_name": meta.get("vendor_name", vendor_name),
                    "po_id": meta.get("po_id", "N/A"),
                    "category": meta.get("category", category or "General"),
                    "text": text,
                    "relevance_score": float(score),
                    "metadata": meta,
                })

            return recalled_list
        except Exception as err:
            logger.error(f"Hindsight recall API error: {err}")
            return []

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
        """Formats procurement outcome into natural language narrative and retains into Hindsight."""
        narrative_parts = [
            f"Procurement outcome for Vendor {vendor_name} on Purchase Request/PO {po_id} (Category: {category}).",
            f"Fulfillment Status Summary: {outcome_summary}.",
        ]

        if delay_days > 0:
            narrative_parts.append(f"Order experienced a delivery delay of {delay_days} days.")
            if delay_reason:
                narrative_parts.append(f"Delay Root Cause: {delay_reason}.")

        if defect_rate > 0:
            narrative_parts.append(f"Quality inspection recorded defect rate of {round(defect_rate * 100, 2)}%.")

        if vendor_explanation:
            narrative_parts.append(f"Vendor Explanation: {vendor_explanation}.")

        if resolution:
            narrative_parts.append(f"Resolution / Action Taken: {resolution}.")

        if additional_cost > 0:
            narrative_parts.append(f"Additional Financial Impact: ${additional_cost:,.2f}.")

        experience_narrative = " ".join(narrative_parts)

        metadata = {
            "delay_days": delay_days,
            "defect_rate": defect_rate,
            "additional_cost": additional_cost,
            "outcome_type": "post_fulfillment_recorded_outcome",
        }

        return self.retain_purchase_experience(
            vendor_name=vendor_name,
            po_id=po_id,
            category=category,
            experience_text=experience_narrative,
            metadata=metadata,
            is_synthetic_context=False,  # Actual recorded outcome
        )


hindsight_service = HindsightService()
