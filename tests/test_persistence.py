from datetime import datetime, timezone

from core.models import (
    Action,
    Evidence,
    Intention,
    Observation,
    Verification,
)
from core.states import (
    ActionState,
    IntentionState,
    VerificationState,
)
from persistence.supabase import SupabasePersistence


class FakeResponse:
    def __init__(self, data=None):
        self.data = data or []


class FakeQuery:
    def __init__(self, client, table_name):
        self.client = client
        self.table_name = table_name
        self.operation = None
        self.payload = None
        self.filters = {}

    def upsert(self, payload):
        self.operation = "upsert"
        self.payload = payload
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def select(self, columns):
        self.operation = "select"
        return self

    def eq(self, column, value):
        self.filters[column] = value
        return self

    def limit(self, value):
        return self

    def execute(self):
        self.client.calls.append(
            {
                "table": self.table_name,
                "operation": self.operation,
                "payload": self.payload,
                "filters": self.filters,
            }
        )

        if self.operation == "select":
            rows = self.client.rows.get(self.table_name, [])

            for column, value in self.filters.items():
                rows = [
                    row
                    for row in rows
                    if row.get(column) == value
                ]

            return FakeResponse(rows)

        return FakeResponse()


class FakeSupabaseClient:
    def __init__(self):
        self.calls = []
        self.rows = {}

    def table(self, table_name):
        return FakeQuery(self, table_name)


def test_save_intention():
    client = FakeSupabaseClient()
    persistence = SupabasePersistence(client)

    intention = Intention(
        id="intent-1",
        goal="test persistence",
        target="system",
        constraints=["safe"],
        status=IntentionState.COMPLETED,
    )

    persistence.save_intention(intention)

    call = client.calls[-1]

    assert call["table"] == "intentions"
    assert call["operation"] == "upsert"
    assert call["payload"] == {
        "id": "intent-1",
        "goal": "test persistence",
        "target": "system",
        "constraints": ["safe"],
        "status": "COMPLETED",
    }


def test_save_action():
    client = FakeSupabaseClient()
    persistence = SupabasePersistence(client)

    action = Action(
        id="action-1",
        intention_id="intent-1",
        actor="test",
        capability_id="test-capability",
        target="system",
        input={"value": 1},
        expected_state={"success": True},
        status=ActionState.SUCCEEDED,
        result={"success": True},
    )

    persistence.save_action(action)

    call = client.calls[-1]

    assert call["table"] == "actions"
    assert call["operation"] == "upsert"
    assert call["payload"]["id"] == "action-1"
    assert call["payload"]["intention_id"] == "intent-1"
    assert call["payload"]["status"] == "SUCCEEDED"
    assert call["payload"]["result"] == {
        "success": True,
    }


def test_save_observation():
    client = FakeSupabaseClient()
    persistence = SupabasePersistence(client)

    observed_at = datetime(
        2026,
        9,
        9,
        tzinfo=timezone.utc,
    )

    observation = Observation(
        id="observation-1",
        action_id="action-1",
        target="system",
        state={"success": True},
        facts=["action succeeded"],
        source="test",
        observed_at=observed_at,
    )

    persistence.save_observation(observation)

    call = client.calls[-1]

    assert call["table"] == "observations"
    assert call["operation"] == "upsert"
    assert call["payload"]["id"] == "observation-1"
    assert call["payload"]["action_id"] == "action-1"
    assert call["payload"]["observed_at"] == (
        "2026-09-09T00:00:00+00:00"
    )


def test_save_evidence():
    client = FakeSupabaseClient()
    persistence = SupabasePersistence(client)

    evidence = Evidence(
        id="evidence-1",
        observation_id="observation-1",
        claim="action succeeded",
        data={"success": True},
        source="test",
        reliability=0.95,
    )

    persistence.save_evidence(evidence)

    call = client.calls[-1]

    assert call["table"] == "evidences"
    assert call["operation"] == "upsert"
    assert call["payload"] == {
        "id": "evidence-1",
        "observation_id": "observation-1",
        "claim": "action succeeded",
        "data": {"success": True},
        "source": "test",
        "reliability": 0.95,
    }


def test_save_verification():
    client = FakeSupabaseClient()
    persistence = SupabasePersistence(client)

    verification = Verification(
        id="verification-1",
        intention_id="intent-1",
        claim="action succeeded",
        result=VerificationState.VERIFIED,
        reason="test verified",
    )

    persistence.save_verification(verification)

    call = client.calls[-1]

    assert call["table"] == "verifications"
    assert call["operation"] == "upsert"
    assert call["payload"] == {
        "id": "verification-1",
        "intention_id": "intent-1",
        "claim": "action succeeded",
        "result": "VERIFIED",
        "reason": "test verified",
    }


def test_get_intention():
    client = FakeSupabaseClient()

    client.rows["intentions"] = [
        {
            "id": "intent-1",
            "goal": "load intention",
            "target": "system",
            "constraints": ["safe"],
            "status": "COMPLETED",
        }
    ]

    persistence = SupabasePersistence(client)

    intention = persistence.get_intention("intent-1")

    assert intention is not None
    assert intention.id == "intent-1"
    assert intention.goal == "load intention"
    assert intention.target == "system"
    assert intention.constraints == ["safe"]


def test_get_intention_not_found():
    client = FakeSupabaseClient()
    persistence = SupabasePersistence(client)

    intention = persistence.get_intention("missing")

    assert intention is None


def test_get_action():
    client = FakeSupabaseClient()

    client.rows["actions"] = [
        {
            "id": "action-1",
            "intention_id": "intent-1",
            "actor": "test",
            "capability_id": "test-capability",
            "target": "system",
            "input": {"value": 1},
            "expected_state": {"success": True},
            "status": "SUCCEEDED",
            "result": {"success": True},
        }
    ]

    persistence = SupabasePersistence(client)

    action = persistence.get_action("action-1")

    assert action is not None
    assert action.id == "action-1"
    assert action.intention_id == "intent-1"
    assert action.actor == "test"
    assert action.capability_id == "test-capability"
    assert action.input == {"value": 1}
    assert action.expected_state == {
        "success": True,
    }


def test_get_action_not_found():
    client = FakeSupabaseClient()
    persistence = SupabasePersistence(client)

    action = persistence.get_action("missing")

    assert action is None


def test_get_observation():
    client = FakeSupabaseClient()

    client.rows["observations"] = [
        {
            "id": "observation-1",
            "action_id": "action-1",
            "target": "system",
            "state": {"success": True},
            "facts": ["action succeeded"],
            "source": "test",
        }
    ]

    persistence = SupabasePersistence(client)

    observation = persistence.get_observation(
        "observation-1"
    )

    assert observation is not None
    assert observation.id == "observation-1"
    assert observation.action_id == "action-1"
    assert observation.target == "system"
    assert observation.state == {
        "success": True,
    }
    assert observation.facts == [
        "action succeeded",
    ]
    assert observation.source == "test"


def test_get_observation_not_found():
    client = FakeSupabaseClient()
    persistence = SupabasePersistence(client)

    observation = persistence.get_observation("missing")

    assert observation is None


def test_get_intention_restores_status():
    client = FakeSupabaseClient()

    client.rows["intentions"] = [
        {
            "id": "intent-state-1",
            "goal": "restore intention state",
            "target": "system",
            "constraints": [],
            "status": "COMPLETED",
        }
    ]

    persistence = SupabasePersistence(client)

    intention = persistence.get_intention("intent-state-1")

    assert intention is not None
    assert intention.status == IntentionState.COMPLETED


def test_get_action_restores_status_and_result():
    client = FakeSupabaseClient()

    client.rows["actions"] = [
        {
            "id": "action-state-1",
            "intention_id": "intent-state-1",
            "actor": "test",
            "capability_id": "test-capability",
            "target": "system",
            "input": {"value": 1},
            "expected_state": {"success": True},
            "status": "SUCCEEDED",
            "result": {"success": True},
        }
    ]

    persistence = SupabasePersistence(client)

    action = persistence.get_action("action-state-1")

    assert action is not None
    assert action.status == ActionState.SUCCEEDED
    assert action.result == {
        "success": True,
    }


def test_get_observation_restores_observed_at():
    client = FakeSupabaseClient()

    client.rows["observations"] = [
        {
            "id": "observation-state-1",
            "action_id": "action-state-1",
            "target": "system",
            "state": {"success": True},
            "facts": ["restored"],
            "source": "test",
            "observed_at": "2026-09-09T00:00:00+00:00",
        }
    ]

    persistence = SupabasePersistence(client)

    observation = persistence.get_observation(
        "observation-state-1"
    )

    assert observation is not None
    assert observation.observed_at == datetime(
        2026,
        9,
        9,
        tzinfo=timezone.utc,
    )
