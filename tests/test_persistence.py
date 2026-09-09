from core.models import (
    Evidence,
    Intention,
    Verification,
    VerificationState,
)
from core.persistence import Persistence
from persistence.supabase import SupabasePersistence


class FakeQuery:
    def __init__(self, calls, table):
        self.calls = calls
        self.table = table
        self.operation = None
        self.payload = None
        self.upsert_options = {}

    def upsert(self, payload, **kwargs):
        self.operation = "upsert"
        self.payload = payload
        self.upsert_options = kwargs
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def execute(self):
        self.calls.append(
            {
                "table": self.table,
                "operation": self.operation,
                "payload": self.payload,
                "options": self.upsert_options,
            }
        )
        return self


class FakeSupabaseClient:
    def __init__(self):
        self.calls = []

    def table(self, table):
        return FakeQuery(self.calls, table)


def test_persistence_interface_exists():
    assert Persistence is not None


def test_save_intention():
    client = FakeSupabaseClient()
    persistence = SupabasePersistence(client)

    intention = Intention(
        id="intent-1",
        goal="test action",
    )

    persistence.save_intention(intention)

    call = client.calls[-1]

    assert call["table"] == "intentions"
    assert call["operation"] == "upsert"
    assert call["payload"]["id"] == "intent-1"
    assert call["payload"]["goal"] == "test action"


def test_save_evidence():
    client = FakeSupabaseClient()
    persistence = SupabasePersistence(client)

    evidence = Evidence(
        id="evidence-1",
        intention_id="intent-1",
        source="test",
        data={"ok": True},
    )

    persistence.save_evidence(evidence)

    call = client.calls[-1]

    assert call["table"] == "evidence"
    assert call["operation"] == "upsert"
    assert call["payload"]["id"] == "evidence-1"
    assert call["payload"]["intention_id"] == "intent-1"


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
    assert call["options"]["on_conflict"] == "id"

Commit satu file ini saja, Bos. Setelah itu bilang “uda”. Saya cek hasil commit dan Actions; kalau masih gagal, kita bedah error berikutnya tanpa mengacak file lain.
