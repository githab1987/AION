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


class FakePersistence:
    def __init__(self):
        self.calls = []

    def save_intention(self, intention):
        self.calls.append(
            ("intention", intention.id, intention.status)
        )

    def save_action(self, action):
        self.calls.append(
            ("action", action.id, action.status)
        )

    def save_observation(self, observation):
        self.calls.append(
            ("observation", observation.id)
        )

    def save_evidence(self, evidence):
        self.calls.append(
            ("evidence", evidence.id)
        )

    def save_verification(self, verification):
        self.calls.append(
            ("verification", verification.intention_id)
        )

    def get_intention(self, intention_id):
        return None

    def get_action(self, action_id):
        return None

    def get_observation(self, observation_id):
        return None


def test_runtime_engine_persists_lifecycle():
    persistence = FakePersistence()

    intention = Intention(
        id="intent-persistence-1",
        goal="test runtime persistence",
    )

    action = Action(
        id="action-persistence-1",
        intention_id=intention.id,
        actor="test",
        capability_id="test-capability",
    )

    observation = Observation(
        id="observation-persistence-1",
        action_id=action.id,
        target="system",
        state={"success": True},
        facts=["action succeeded"],
    )

    evidence = Evidence(
        id="evidence-persistence-1",
        observation_id=observation.id,
        claim="action succeeded",
        data={"success": True},
        source="test",
        reliability=1.0,
    )

    verification = Verification(
        intention_id=intention.id,
        claim=intention.goal,
        evidence=[evidence],
        result=VerificationState.VERIFIED,
        reason="persistence test verified",
    )

    engine = RuntimeEngine(
        action_handler=lambda action: {
            "success": True,
        },
        verification_handler=lambda intention, observation, evidence: (
            verification
        ),
        persistence=persistence,
    )

    result = engine.run(
        intention=intention,
        action=action,
        observation=observation,
        evidence=[evidence],
    )

    assert result.intention.status == IntentionState.COMPLETED
    assert result.action.status == ActionState.SUCCEEDED
    assert result.verification.result == VerificationState.VERIFIED

    call_types = [
        call[0]
        for call in persistence.calls
    ]

    assert "intention" in call_types
    assert "action" in call_types
    assert "observation" in call_types
    assert "evidence" in call_types
    assert "verification" in call_types

    assert persistence.calls[-1] == (
        "intention",
        "intent-persistence-1",
        IntentionState.COMPLETED,
    )
