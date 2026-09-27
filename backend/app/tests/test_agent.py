"""Integration tests for Groq LLM Provider, Procurement Agent, and Evaluation API."""

from app.agent.provider import LLMProvider
from app.agent.procurement_agent import ProcurementAgent


def test_llm_provider_mock_completion():
    """Test LLM Provider generates completions in mock mode without API keys."""
    provider = LLMProvider(api_key="", model="openai/gpt-oss-120b")
    response = provider.generate_analysis("Evaluate supplier Acme")
    assert "baseline metrics" in response


def test_procurement_agent_evaluation(db_session):
    """Test ProcurementAgent evaluates a purchase request using DB stats and Hindsight memories."""
    agent = ProcurementAgent()

    result = agent.evaluate_purchase_request(db_session, purchase_request_id="pr-agent-1")

    assert result["purchase_request_id"] == "pr-agent-1"
    assert result["recommended_vendor"] == "Test Acme Corp"
    assert "Test Acme Corp" in result["recommendation"]
    assert "memory_evidence" in result
    assert "vendor_comparison" in result


def test_evaluation_api_endpoint(client):
    """Test POST /api/v1/evaluations API endpoint."""
    eval_payload = {"purchase_request_id": "pr-agent-1"}
    res = client.post("/api/v1/evaluations", json=eval_payload)

    assert res.status_code == 200
    data = res.json()
    assert data["purchase_request_id"] == "pr-agent-1"
    assert data["recommended_vendor"] == "Test Acme Corp"
    assert "Test Acme Corp" in data["recommendation"]
    assert isinstance(data["memory_evidence"], list)

    # Verify PR status updated to 'evaluated'
    pr_res = client.get("/api/v1/purchase-requests/pr-agent-1")
    assert pr_res.json()["status"] == "evaluated"


def test_outcome_retention_loop(client):
    """Test POST /api/v1/outcomes retains experience in Hindsight and sets is_retained_to_hindsight = True."""
    outcome_payload = {
        "purchase_request_id": "pr-agent-1",
        "vendor_id": "v-101",
        "actual_delivery_date": "2025-07-16",
        "actual_delivery_days": 11,
        "delay_days": 1,
        "defect_rate": 0.0,
        "defective_units": 0,
        "delay_reason": "Minor transit delay",
        "vendor_explanation": "Truck driver dispatch delay",
        "resolution": "Batch received in full next morning",
        "additional_cost": 0.0,
        "outcome_summary": "Order delivered next morning with 1 day minor delay.",
    }

    res = client.post("/api/v1/outcomes", json=outcome_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["purchase_request_id"] == "pr-agent-1"
    assert data["is_retained_to_hindsight"] is True
