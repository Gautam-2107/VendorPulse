"""Hindsight Memory Service for VendorPulse.

Encapsulates official Hindsight Python SDK client integration, memory retention,
contextual memory recall, and deterministic offline mock fallback store.
"""

from typing import Any, Dict, List, Optional
import logging
from pathlib import Path
import pandas as pd
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
                logger.info(f"Initialized live Hindsight SDK client for bank '{self.bank_id}' at '{self.api_url}'")
            except Exception as err:
                logger.warning(f"Failed to initialize live Hindsight SDK client: {err}. Falling back to mock mode.")
                self.mock_mode = True
        else:
            self.mock_mode = True

        # Pre-seed default mock memory bank with historical experiences if empty
        self._init_mock_memories()

    def _init_mock_memories(self) -> None:
        """Pre-populates default mock memory bank with historical vendor experiences."""
        if self._mock_memories:
            return

        # Attempt loading from final_procurement_dataset.csv or vendor_purchase_history.csv
        repo_root = Path(__file__).resolve().parents[3]
        processed_dir = repo_root / "data" / "processed"
        csv_file = processed_dir / "final_procurement_dataset.csv"
        if not csv_file.exists():
            csv_file = processed_dir / "vendor_purchase_history.csv"

        if csv_file.exists():
            try:
                df = pd.read_csv(csv_file)
                from app.services.data_service import convert_record_to_hindsight_experience
                for _, row in df.iterrows():
                    rec = row.to_dict()
                    exp_obj = convert_record_to_hindsight_experience(rec)
                    self._mock_memories.append({
                        "vendor_name": exp_obj["vendor_name"],
                        "po_id": exp_obj["po_id"],
                        "category": exp_obj["category"],
                        "text": exp_obj["experience_text"],
                        "metadata": {
                            "vendor_name": exp_obj["vendor_name"],
                            "po_id": exp_obj["po_id"],
                            "category": exp_obj["category"],
                            "is_synthetic_context": exp_obj["is_synthetic_context"],
                        },
                    })
                logger.info(f"[Hindsight Mock] Pre-populated {len(self._mock_memories)} historical memories.")
                return
            except Exception as err:
                logger.warning(f"Failed to pre-load mock memories from CSV: {err}")

        # Fallback default hardcoded demo vendor memories if CSV is absent
        default_demo_memories = [
            {
                "vendor_name": "SteelCore",
                "po_id": "PO-00012",
                "category": "Structural Steel",
                "text": "Purchase Order PO-00012 for 500 units of Structural Steel with supplier SteelCore. Order Status: Delivered. Actual fulfillment delivery duration was 22 days. Quality defect rate recorded at 12.0%. [Qualitative Context - Synthetic Demo Data]: Delay Root Cause: Summer seasonal port customs backlog and factory heat-treatment calibration delay | Vendor Explanation: SteelCore reported sub-tier furnace maintenance and regional port congestion. | Resolution Action: Batch quarantined; supplier dispatched technical team and offered 5% credit. | Additional Financial Impact: $4,500.00",
                "metadata": {"vendor_name": "SteelCore", "category": "Structural Steel", "po_id": "PO-00012"},
            },
            {
                "vendor_name": "MetalWorks",
                "po_id": "PO-00105",
                "category": "Structural Steel",
                "text": "Purchase Order PO-00105 for 400 units of Structural Steel with supplier MetalWorks. Order Status: Delivered. Actual fulfillment delivery duration was 10 days. Quality defect rate recorded at 0.5%. MetalWorks completed fulfillment according to primary SLA without reported issues.",
                "metadata": {"vendor_name": "MetalWorks", "category": "Structural Steel", "po_id": "PO-00105"},
            },
            {
                "vendor_name": "PrimeSteel",
                "po_id": "PO-00210",
                "category": "Structural Steel",
                "text": "Purchase Order PO-00210 for 600 units of Structural Steel with supplier PrimeSteel. Order Status: Delivered. Actual fulfillment delivery duration was 15 days. Quality defect rate recorded at 3.5%. PrimeSteel fulfilled order with minor lead time variance.",
                "metadata": {"vendor_name": "PrimeSteel", "category": "Structural Steel", "po_id": "PO-00210"},
            },
        ]
        self._mock_memories.extend(default_demo_memories)

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
            logger.info(f"[Hindsight Retain] Ingesting memory for vendor '{vendor_name}' into bank '{self.bank_id}'")
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
        search_query = f"{vendor_name} {category or ''} {query}".strip()
        logger.info(
            f"[Hindsight Recall Query] Bank: '{self.bank_id}' | Vendor: '{vendor_name}' | Query: '{search_query}' | Mock Mode: {self.mock_mode}"
        )

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

                # Filter strictly by vendor match when vendor_name is provided
                vendor_match = (
                    m_v == vendor_clean or
                    vendor_clean in m_v or
                    m_v in vendor_clean
                ) if vendor_clean else True

                if not vendor_match:
                    continue

                # Relevance scoring logic
                match_score = 0.5
                if cat_clean and (m_c == cat_clean or cat_clean in m_c or m_c in cat_clean):
                    match_score += 0.3
                if query_clean and any(q_term in m_text for q_term in query_clean.split() if len(q_term) > 3):
                    match_score += 0.2

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
            recalled = results[:top_k]
            logger.info(f"[Mock Hindsight Recall] Vendor '{vendor_name}' returned {len(recalled)} memories.")
            return recalled

        try:
            # SDK Call to Hindsight Cloud
            recall_response = self._client.recall(
                bank_id=self.bank_id,
                query=search_query,
            )

            recalled_list = []
            # Standardize response structure from SDK (RecallResponse contains .results attribute)
            items = (
                getattr(recall_response, "results", None)
                or getattr(recall_response, "memories", None)
                or (recall_response if isinstance(recall_response, list) else [])
            )

            logger.info(f"[Hindsight Recall SDK] Bank '{self.bank_id}' returned {len(items)} raw memory items.")

            for item in items:
                text = (
                    getattr(item, "text", None)
                    or getattr(item, "content", None)
                    or getattr(item, "context", None)
                    or str(item)
                )
                meta = getattr(item, "metadata", {}) or {}
                scores = getattr(item, "scores", {}) or {}
                score = scores.get("overall", getattr(item, "score", 0.85)) if isinstance(scores, dict) else 0.85

                recalled_list.append({
                    "vendor_name": meta.get("vendor_name", vendor_name),
                    "po_id": meta.get("po_id", "N/A"),
                    "category": meta.get("category", category or "General"),
                    "text": text,
                    "relevance_score": float(score) if score is not None else 0.85,
                    "metadata": meta,
                })

            return recalled_list[:top_k]
        except Exception as err:
            logger.error(f"[Hindsight Recall Exception] API error for bank '{self.bank_id}' query '{search_query}': {err}")
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
