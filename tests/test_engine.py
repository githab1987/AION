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

def test_runtime_engine_action_failure():
    intention = Intention(
        id="intent-2",
        goal="test runtime failure",
    )

    action = Action(
        id="action-2",
        intention_id="intent-2",
        actor="test",
        capability_id="test-capability",
    )

    observation = Observation(
        id="observation-2",
        action_id="action-2",
        target=None,
    )

    def action_handler(action):
        raise RuntimeError("action failed")

    def verification_handler(intention, observation, evidence):
        raise AssertionError("verification must not run after action failure")

    engine = RuntimeEngine(
        action_handler=action_handler,
        verification_handler=verification_handler,
    )

    result = engine.run(
        intention=intention,
        action=action,
        observation=observation,
    )

    assert result.intention.status.value == "FAILED"
    assert result.action.status.value == "FAILED"
    assert result.action.result["error"] == "action failed"
    assert result.verification is None


def test_runtime_engine_verification_failure():
    intention = Intention(
        id="intent-3",
        goal="test verification failure",
    )

    action = Action(
        id="action-3",
        intention_id="intent-3",
        actor="test",
        capability_id="test-capability",
    )

    observation = Observation(
        id="observation-3",
        action_id="action-3",
        target=None,
        state={"success": True},
    )

    def action_handler(action):
        return {"success": True}

    def verification_handler(intention, observation, evidence):
        return Verification(
            intention_id=intention.id,
            claim="runtime verified",
            evidence=evidence,
            result=VerificationState.REJECTED,
            reason="verification rejected",
        )

    engine = RuntimeEngine(
        action_handler=action_handler,
        verification_handler=verification_handler,
    )

    result = engine.run(
        intention=intention,
        action=action,
        observation=observation,
    )

    assert result.action.status.value == "SUCCEEDED"
    assert result.verification.result.value == "REJECTED"
    assert result.intention.status.value == "FAILED"
