"""Unit tests for Hindsight Memory Service."""

import pytest
from app.services.hindsight_service import HindsightService


@pytest.fixture
def mock_hindsight_service():
    """Returns a HindsightService forced into mock mode for deterministic offline testing."""
    return HindsightService(
        api_url="https://api.hindsight.vectorize.io",
        api_key="test-key",
        bank_id="vendorpulse-procurement",
        mock_mode=True,
    )


def test_hindsight_initialization(mock_hindsight_service):
    """Test Hindsight service initialization and bank configuration."""
    assert mock_hindsight_service.bank_id == "vendorpulse-procurement"
    assert mock_hindsight_service.mock_mode is True


def test_hindsight_retain_and_recall_experience(mock_hindsight_service):
    """Test retaining purchase experience and recalling vendor memories."""
    # 1. Retain Memory
    success = mock_hindsight_service.retain_purchase_experience(
        vendor_name="SteelCore Corp",
        po_id="PO-7788",
        category="Structural Steel",
        experience_text="Purchase Order PO-7788 experienced a 15-day delivery delay due to port customs backlog.",
        metadata={"delay_days": 15},
        is_synthetic_context=True,
    )
    assert success is True

    # 2. Recall Memory
    recalled = mock_hindsight_service.recall_vendor_experience(
        vendor_name="SteelCore Corp",
        query="Structural Steel delay",
        category="Structural Steel",
    )

    assert len(recalled) == 1
    assert recalled[0]["vendor_name"] == "SteelCore Corp"
    assert "15-day delivery delay" in recalled[0]["text"]
    assert recalled[0]["relevance_score"] > 0.0


def test_retain_procurement_outcome(mock_hindsight_service):
    """Test retaining a post-fulfillment procurement outcome."""
    success = mock_hindsight_service.retain_procurement_outcome(
        vendor_name="Global Fasteners Inc",
        po_id="PR-0012",
        category="Fasteners",
        outcome_summary="Delivered 3 days late with 5% defective batch.",
        delay_days=3,
        defect_rate=0.05,
        delay_reason="Raw material supply delay",
        vendor_explanation="Sub-tier vendor delay",
        resolution="Vendor provided 5% rebate",
        additional_cost=500.0,
    )

    assert success is True

    # Verify recall
    recalled = mock_hindsight_service.recall_vendor_experience(
        vendor_name="Global Fasteners Inc",
        query="Fasteners",
    )
    assert len(recalled) == 1
    assert "5% defective batch" in recalled[0]["text"]
    assert recalled[0]["metadata"]["is_synthetic_context"] is False
