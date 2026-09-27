"""Purchase request risk evaluation endpoints."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.purchase_request import PurchaseRequest
from app.agent.procurement_agent import procurement_agent

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])


class EvaluationRequest(BaseModel):
    purchase_request_id: str


class EvaluationResponse(BaseModel):
    purchase_request_id: str
    recommended_vendor: str
    recommended_vendor_id: Optional[str] = None
    recommendation: str
    reasoning: str
    risk_summary: str
    memory_evidence: List[Dict[str, Any]]
    vendor_comparison: List[Dict[str, Any]]
    important_caveats: str


@router.post("", response_model=EvaluationResponse)
def evaluate_purchase_request_endpoint(
    req_in: EvaluationRequest,
    db: Session = Depends(get_db),
):
    """Executes VendorPulse risk evaluation using baseline metrics and Hindsight memories."""
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == req_in.purchase_request_id).first()
    if not pr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Purchase request with ID '{req_in.purchase_request_id}' not found.",
        )

    try:
        eval_result = procurement_agent.evaluate_purchase_request(db, req_in.purchase_request_id)

        # Update purchase request status to evaluated
        if pr.status == "pending":
            pr.status = "evaluated"
            db.commit()

        return eval_result
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed: {err}",
        )
