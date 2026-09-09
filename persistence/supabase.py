from datetime import datetime
from typing import Optional

from core.models import (
    Action,
    Evidence,
    Intention,
    Observation,
    Verification,
)
from core.persistence import Persistence
from core.states import (
    ActionState,
    IntentionState,
    VerificationState,
)


class SupabasePersistence(Persistence):
    """
    Supabase persistence adapter.

    This layer translates AION domain models into
    Supabase-compatible records.
    """

    def __init__(self, client):
        self.client = client

    def save_intention(self, intention: Intention) -> None:
        self.client.table("intentions").upsert(
            {
                "id": intention.id,
                "goal": intention.goal,
                "target": intention.target,
                "constraints": intention.constraints,
                "status": intention.status.value,
            }
        ).execute()

    def save_action(self, action: Action) -> None:
        self.client.table("actions").upsert(
            {
                "id": action.id,
                "intention_id": action.intention_id,
                "actor": action.actor,
                "capability_id": action.capability_id,
                "target": action.target,
                "input": action.input,
                "expected_state": action.expected_state,
                "status": action.status.value,
                "result": action.result,
            }
        ).execute()

    def save_observation(self, observation: Observation) -> None:
        self.client.table("observations").upsert(
            {
                "id": observation.id,
                "action_id": observation.action_id,
                "target": observation.target,
                "state": observation.state,
                "facts": observation.facts,
                "source": observation.source,
                "observed_at": observation.observed_at.isoformat(),
            }
        ).execute()

    def save_evidence(self, evidence: Evidence) -> None:
        self.client.table("evidences").upsert(
            {
                "id": evidence.id,
                "observation_id": evidence.observation_id,
                "claim": evidence.claim,
                "data": evidence.data,
                "source": evidence.source,
                "reliability": evidence.reliability,
            }
        ).execute()

    def save_verification(
        self,
        verification: Verification,
    ) -> None:
        self.client.table("verifications").upsert(
            {
                "id": verification.id,
                "intention_id": verification.intention_id,
                "claim": verification.claim,
                "result": verification.result.value,
                "reason": verification.reason,
            },
            on_conflict="id",
        ).execute()

    def get_intention(
        self,
        intention_id: str,
    ) -> Optional[Intention]:
        response = (
            self.client
            .table("intentions")
            .select("*")
            .eq("id", intention_id)
            .limit(1)
            .execute()
        )

        if not response.data:
            return None

        row = response.data[0]

        return Intention(
            id=row["id"],
            goal=row["goal"],
            target=row.get("target"),
            constraints=row.get("constraints", []),
            status=IntentionState(
                row.get(
                    "status",
                    IntentionState.DECLARED.value,
                )
            ),
        )

    def get_action(
        self,
        action_id: str,
    ) -> Optional[Action]:
        response = (
            self.client
            .table("actions")
            .select("*")
            .eq("id", action_id)
            .limit(1)
            .execute()
        )

        if not response.data:
            return None

        row = response.data[0]

        return Action(
            id=row["id"],
            intention_id=row["intention_id"],
            actor=row["actor"],
            capability_id=row["capability_id"],
            target=row.get("target"),
            input=row.get("input", {}),
            expected_state=row.get("expected_state", {}),
            status=ActionState(
                row.get(
                    "status",
                    ActionState.PLANNED.value,
                )
            ),
            result=row.get("result"),
        )

    def get_observation(
        self,
        observation_id: str,
    ) -> Optional[Observation]:
        response = (
            self.client
            .table("observations")
            .select("*")
            .eq("id", observation_id)
            .limit(1)
            .execute()
        )

        if not response.data:
            return None

        row = response.data[0]

        observed_at = row.get("observed_at")

        if isinstance(observed_at, str):
            observed_at = datetime.fromisoformat(
                observed_at.replace("Z", "+00:00")
            )

        return Observation(
            id=row["id"],
            action_id=row["action_id"],
            target=row.get("target"),
            state=row.get("state", {}),
            facts=row.get("facts", []),
            source=row.get("source", "runtime"),
            observed_at=observed_at,
        )

    def get_verification(
        self,
        verification_id: str,
    ) -> Optional[Verification]:
        response = (
            self.client
            .table("verifications")
            .select("*")
            .eq("id", verification_id)
            .limit(1)
            .execute()
        )

        if not response.data:
            return None

        row = response.data[0]

        return Verification(
            id=row["id"],
            intention_id=row["intention_id"],
            claim=row["claim"],
            evidence=[],
            result=VerificationState(
                row.get(
                    "result",
                    VerificationState.UNKNOWN.value,
                )
            ),
            reason=row.get("reason", ""),
        )
