from core.models import (
    Action,
    Evidence,
    Intention,
    Observation,
    Verification,
)
from core.states import VerificationState
from runtime.engine import RuntimeEngine


def test_runtime_engine_success():
    intention = Intention(
        id="intent-1",
        goal="test runtime",
    )

    action = Action(
        id="action-1",
        intention_id="intent-1",
        actor="test",
        capability_id="test-capability",
    )

    observation = Observation(
        id="observation-1",
        action_id="action-1",
        target=None,
        state={"success": True},
        facts=["runtime executed"],
    )

    evidence = [
        Evidence(
            id="evidence-1",
            observation_id="observation-1",
            claim="runtime executed successfully",
        )
    ]

    def action_handler(action):
        return {"success": True}

    def verification_handler(intention, observation, evidence):
        return Verification(
            intention_id=intention.id,
            claim="runtime executed successfully",
            evidence=evidence,
            result=VerificationState.VERIFIED,
            reason="test verification passed",
        )

    engine = RuntimeEngine(
        action_handler=action_handler,
        verification_handler=verification_handler,
    )

    result = engine.run(
        intention=intention,
        action=action,
        observation=observation,
        evidence=evidence,
    )

    assert result.intention.status.value == "COMPLETED"
    assert result.action.status.value == "SUCCEEDED"
    assert result.verification.result.value == "VERIFIED"
    assert result.action.result["success"] is True
