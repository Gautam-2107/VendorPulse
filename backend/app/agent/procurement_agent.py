from typing import Any, Dict, List
import re

from sqlalchemy.orm import Session

from app.models.purchase_request import PurchaseRequest
from app.models.vendor import Vendor
from app.services.hindsight_service import hindsight_service
from app.agent.provider import llm_provider


class ProcurementAgent:
    """AI Procurement Vendor Risk Agent powered by Hindsight Memory."""

    @staticmethod
    def _memory_risk(memory_text: str) -> tuple[float, List[str]]:
        """
        Convert recalled Hindsight history into a bounded contextual adjustment.

        Positive values = historical risk.
        Negative values = historical reliability credit.
        """
        text = memory_text.lower()
        risk = 0.0
        flags: List[str] = []

        # Accept both "defect rate" and "defectrate".
        defect_matches = re.findall(
            r"(?:defect\s*rate)\s*(?:of|is)?\s*(\d+(?:\.\d+)?)%",
            text,
        )

        for value in defect_matches:
            defect_rate = float(value)

            if defect_rate >= 10:
                risk += 8.0
                flags.append(f"high historical defect rate ({defect_rate:.2f}%)")
            elif defect_rate >= 5:
                risk += 4.0
                flags.append(f"elevated historical defect rate ({defect_rate:.2f}%)")
            elif defect_rate <= 1.0:
                risk -= 1.0
                flags.append(f"strong historical quality ({defect_rate:.2f}% defects)")

        # Explicit delay wording.
        delay_matches = re.findall(
            r"(?:delivery\s+delay(?:\s+of)?|delay(?:\s+of)?)\s*(\d+)\s*days",
            text,
        )

        for value in delay_matches:
            delay = int(value)

            if delay >= 14:
                risk += 6.0
                flags.append(f"historical delivery delay ({delay} days)")
            elif delay > 0:
                risk += 2.0
                flags.append(f"historical delivery delay ({delay} days)")

        # Fulfillment-duration wording.
        duration_matches = re.findall(
            r"(\d+)\s*[- ]day\s+(?:delivery\s+)?duration",
            text,
        )

        duration_matches += re.findall(
            r"(?:delivery\s+duration|fulfillment\s+duration)"
            r"\s*(?:of|was|is)?\s*(\d+)\s*days",
            text,
        )

        # "delivered in 10 days"
        duration_matches += re.findall(
            r"(?:delivered|fulfilled|fulfillment)\s+(?:[^.]{0,80}?)\bin\s+(\d+)\s+days",
            text,
        )

        seen_durations = set()

        for value in duration_matches:
            duration = int(value)

            if duration in seen_durations:
                continue

            seen_durations.add(duration)

            if duration >= 20:
                risk += 4.0
                flags.append(
                    f"long historical fulfillment cycle ({duration} days)"
                )
            elif duration <= 12:
                risk -= 0.5
                flags.append(
                    f"efficient historical fulfillment ({duration} days)"
                )

        # Operational/contextual risk.
        contextual_risks = {
            "non-compliant": 3.0,
            "partially delivered": 3.0,
            "cancelled": 4.0,
            "supplier fulfillment incapacity": 4.0,
            "port congestion": 2.0,
            "customs backlog": 2.0,
            "customs backlogs": 2.0,
            "furnace maintenance": 2.0,
            "heat-treatment": 2.0,
            "freight dispatch delay": 2.0,
        }

        for term, penalty in contextual_risks.items():
            if term in text:
                risk += penalty
                flags.append(term)

        # Reliability credits.
        if "compliant" in text and "non-compliant" not in text:
            risk -= 0.5
            flags.append("historically compliant")

        if "successfully delivered" in text or "was delivered" in text:
            risk -= 0.5
            flags.append("successful historical delivery")

        # Keep any single memory from dominating the vendor baseline.
        return max(-3.0, min(risk, 12.0)), list(dict.fromkeys(flags))

    def evaluate_purchase_request(
        self,
        db: Session,
        purchase_request_id: str,
    ) -> Dict[str, Any]:
        """Evaluate a purchase request using structured metrics plus Hindsight."""

        # 1. Fetch Purchase Request
        pr = (
            db.query(PurchaseRequest)
            .filter(PurchaseRequest.id == purchase_request_id)
            .first()
        )

        if not pr:
            raise ValueError(
                f"Purchase request with ID '{purchase_request_id}' not found."
            )

        # 2. Fetch Candidate Vendors
        vendors = db.query(Vendor).all()

        if not vendors:
            return {
                "purchase_request_id": purchase_request_id,
                "recommended_vendor": "None Available",
                "recommendation": "No candidate vendors available in database.",
                "reasoning": "Database contains no registered vendors to evaluate.",
                "risk_summary": "High Risk - No vendors available.",
                "memory_evidence": [],
                "vendor_comparison": [],
                "important_caveats": "Please seed vendor records.",
            }

        # 3. Recall and filter Hindsight memories
        vendor_evidence_list = []
        all_recalled_memories = []

        target_terms = {
            term.strip().lower()
            for term in re.split(
                r"[,/|]",
                f"{pr.material_name},{pr.material_category}",
            )
            if term.strip()
        }

        for vendor in vendors:
            recalled = hindsight_service.recall_vendor_experience(
                vendor_name=vendor.name,
                query=f"{pr.material_name} {pr.material_category}",
                category=pr.material_category,
                top_k=10,
            )

            def matches_material(memory: Dict[str, Any]) -> bool:
                text = str(memory.get("text", "")).lower()
                return any(term in text for term in target_terms)

            recalled = [
                memory
                for memory in recalled
                if matches_material(memory)
            ]

            # Prioritize memories that contain actual historical signals,
            # then use Hindsight relevance as the tie breaker.
            recalled.sort(
                key=lambda memory: (
                    abs(
                        self._memory_risk(
                            str(memory.get("text", ""))
                        )[0]
                    ),
                    float(memory.get("relevance_score", 0.0)),
                ),
                reverse=True,
            )

            recalled = recalled[:3]

            memory_texts = []

            for memory in recalled:
                memory_text = str(memory.get("text", ""))

                entry = {
                    "vendor": vendor.name,
                    "memory": memory_text,
                    "relevance": (
                        f"Relevance score: "
                        f"{memory.get('relevance_score', 0.0)} "
                        f"for {pr.material_category}"
                    ),
                }

                all_recalled_memories.append(entry)
                memory_texts.append(memory_text)

            vendor_evidence_list.append(
                {
                    "vendor_id": vendor.id,
                    "vendor_name": vendor.name,
                    "total_orders": vendor.total_orders,
                    "delivery_days_avg": vendor.average_delivery_days,
                    "defect_rate_avg": vendor.average_defect_rate,
                    "compliance_failure_rate": vendor.compliance_failure_rate,
                    "recalled_memories": memory_texts,
                }
            )

        # 4. LLM analysis
        prompt_lines = [
            (
                f"Evaluate Purchase Request {pr.request_number} for "
                f"{pr.quantity} units of '{pr.material_name}' "
                f"(Category: {pr.material_category}, "
                f"Budget: ${pr.budget:,.2f})."
            ),
            "\nCandidate Vendors & Recalled Hindsight Memories:",
        ]

        for evidence in vendor_evidence_list:
            prompt_lines.append(
                f"- Vendor: {evidence['vendor_name']} | "
                f"Avg Delivery Days: {evidence['delivery_days_avg']} | "
                f"Avg Defect Rate: "
                f"{round((evidence['defect_rate_avg'] or 0) * 100, 2)}% | "
                f"Compliance Failure Rate: "
                f"{round((evidence['compliance_failure_rate'] or 0) * 100, 2)}%"
            )

            if evidence["recalled_memories"]:
                prompt_lines.append(
                    "  Recalled Historical Experiences from Hindsight:"
                )

                for memory in evidence["recalled_memories"]:
                    prompt_lines.append(f"    * {memory}")
            else:
                prompt_lines.append(
                    "  Recalled Historical Experiences from Hindsight: "
                    "None recorded."
                )

        prompt_lines.append(
            "\nTask: Select the best vendor, explaining the decision using "
            "BOTH structured baseline statistics AND recalled Hindsight "
            "history. Highlight historical risk and reliability signals."
        )

        analysis_text = llm_provider.generate_analysis(
            prompt="\n".join(prompt_lines)
        )

        # 5. Deterministic memory-adjusted scoring
        vendor_risk_scores: Dict[str, Dict[str, Any]] = {}

        for evidence in vendor_evidence_list:
            defect_penalty = (
                evidence["defect_rate_avg"] or 0.0
            ) * 100

            compliance_penalty = (
                evidence["compliance_failure_rate"] or 0.0
            ) * 50

            delivery_penalty = evidence["delivery_days_avg"] or 10.0

            baseline_risk = (
                defect_penalty
                + compliance_penalty
                + delivery_penalty
            )

            memory_adjustment = 0.0
            memory_flags: List[str] = []

            for memory_text in evidence["recalled_memories"]:
                adjustment, flags = self._memory_risk(memory_text)
                memory_adjustment += adjustment
                memory_flags.extend(flags)

            # Bound total Hindsight influence.
            memory_adjustment = max(
                -5.0,
                min(memory_adjustment, 20.0),
            )

            combined_risk = baseline_risk + memory_adjustment

            vendor_risk_scores[evidence["vendor_name"]] = {
                "baseline_risk": round(baseline_risk, 2),
                "memory_adjustment": round(memory_adjustment, 2),
                "combined_risk": round(combined_risk, 2),
                "memory_flags": list(dict.fromkeys(memory_flags)),
            }

        # 6. Select lowest memory-adjusted risk.
        best_vendor = min(
            vendors,
            key=lambda vendor: vendor_risk_scores[vendor.name]["combined_risk"],
        )

        selected = vendor_risk_scores[best_vendor.name]

        # 7. Structured response
        return {
            "purchase_request_id": purchase_request_id,
            "recommended_vendor": best_vendor.name,
            "recommended_vendor_id": best_vendor.id,
            "recommendation": (
                f"Recommend approving order with "
                f"'{best_vendor.name}' for {pr.quantity} units "
                f"of {pr.material_name}."
            ),
            "reasoning": (
                f"{analysis_text} "
                f"Selected '{best_vendor.name}' using structured vendor "
                f"metrics plus Hindsight historical memory. "
                f"Baseline risk: {selected['baseline_risk']}; "
                f"Hindsight adjustment: {selected['memory_adjustment']}; "
                f"combined risk: {selected['combined_risk']}."
            ),
            "risk_summary": (
                f"Memory-adjusted risk. "
                f"Baseline defect rate: "
                f"{round((best_vendor.average_defect_rate or 0) * 100, 2)}%. "
                f"Average lead time: "
                f"{best_vendor.average_delivery_days or 10.0} days. "
                f"Hindsight adjustment: "
                f"{selected['memory_adjustment']:+.2f} risk points."
            ),
            "memory_evidence": all_recalled_memories,
            "vendor_comparison": [
                {
                    "vendor_id": evidence["vendor_id"],
                    "vendor_name": evidence["vendor_name"],
                    "delivered_orders": evidence["total_orders"],
                    "average_delivery_days": evidence["delivery_days_avg"],
                    "average_defect_rate": evidence["defect_rate_avg"],
                    "memory_count": len(evidence["recalled_memories"]),
                    "baseline_risk": vendor_risk_scores[
                        evidence["vendor_name"]
                    ]["baseline_risk"],
                    "hindsight_adjustment": vendor_risk_scores[
                        evidence["vendor_name"]
                    ]["memory_adjustment"],
                    "combined_risk": vendor_risk_scores[
                        evidence["vendor_name"]
                    ]["combined_risk"],
                    "memory_flags": vendor_risk_scores[
                        evidence["vendor_name"]
                    ]["memory_flags"],
                }
                for evidence in vendor_evidence_list
            ],
            "important_caveats": (
                "Human procurement manager must perform final approval "
                "before issuing formal purchase order."
            ),
        }


procurement_agent = ProcurementAgent()
