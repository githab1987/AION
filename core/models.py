from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .states import (
    ActionState,
    IntentionState,
    VerificationState,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class World:
    id: str
    name: str = "local"
    state: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Intention:
    id: str
    goal: str
    target: Optional[str] = None
    constraints: List[str] = field(default_factory=list)
    status: IntentionState = IntentionState.DECLARED


@dataclass
class Capability:
    id: str
    name: str
    can_do: List[str] = field(default_factory=list)
    effects: List[str] = field(default_factory=list)
    enabled: bool = True


@dataclass
class Action:
    id: str
    intention_id: str
    actor: str
    capability_id: str
    target: Optional[str] = None
    input: Dict[str, Any] = field(default_factory=dict)
    expected_state: Dict[str, Any] = field(default_factory=dict)
    status: ActionState = ActionState.PLANNED
    result: Optional[Dict[str, Any]] = None


@dataclass
class Observation:
    id: str
    action_id: str
    target: Optional[str]
    state: Dict[str, Any] = field(default_factory=dict)
    facts: List[str] = field(default_factory=list)
    source: str = "runtime"
    observed_at: datetime = field(default_factory=utc_now)


@dataclass
class Evidence:
    id: str
    observation_id: str
    claim: str
    data: Dict[str, Any] = field(default_factory=dict)
    source: str = "runtime"
    reliability: Optional[float] = None


@dataclass
class Verification:
    id: str
    intention_id: str
    claim: str
    evidence: List[Evidence] = field(default_factory=list)
    result: VerificationState = VerificationState.UNKNOWN
    reason: str = ""


@dataclass
class RuntimeResult:
    intention: Intention
    action: Optional[Action] = None
    observation: Optional[Observation] = None
    evidence: List[Evidence] = field(default_factory=list)
    verification: Optional[Verification] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "intention": {
                "id": self.intention.id,
                "goal": self.intention.goal,
                "target": self.intention.target,
                "constraints": self.intention.constraints,
                "status": self.intention.status.value,
            },
            "action": None if self.action is None else {
                "id": self.action.id,
                "status": self.action.status.value,
                "result": self.action.result,
            },
            "observation": None if self.observation is None else {
                "id": self.observation.id,
                "target": self.observation.target,
                "state": self.observation.state,
                "facts": self.observation.facts,
                "source": self.observation.source,
            },
            "evidence": [
                {
                    "id": item.id,
                    "claim": item.claim,
                    "data": item.data,
                    "source": item.source,
                    "reliability": item.reliability,
                }
                for item in self.evidence
            ],
            "verification": None if self.verification is None else {
                "id": self.verification.id,
                "claim": self.verification.claim,
                "result": self.verification.result.value,
                "reason": self.verification.reason,
                "evidence_count": len(self.verification.evidence),
            },
        }
