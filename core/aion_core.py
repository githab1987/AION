"""AION Semantic Core v0.1"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class Status(str, Enum):
    DECLARED = "DECLARED"
    PLANNED = "PLANNED"
    EXECUTING = "EXECUTING"
    OBSERVING = "OBSERVING"
    VERIFYING = "VERIFYING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"
    UNKNOWN = "UNKNOWN"
    UNVERIFIED = "UNVERIFIED"
    CONFLICTED = "CONFLICTED"
    STOPPED = "STOPPED"


@dataclass
class Intention:
    goal: str
    constraints: List[str] = field(default_factory=list)
    status: Status = Status.DECLARED


@dataclass
class Capability:
    name: str
    can: bool = True
    effects: List[str] = field(default_factory=list)


@dataclass
class Authority:
    actor: str
    allowed_capabilities: List[str] = field(default_factory=list)

    def may(self, capability: Capability) -> bool:
        return capability.name in self.allowed_capabilities


@dataclass
class Action:
    actor: str
    capability: str
    target: str
    expected_state: Optional[str] = None
    status: Status = Status.EXECUTING
    result: Any = None


@dataclass
class Observation:
    target: str
    state: str
    facts: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Evidence:
    source: str
    claim: str
    data: Any


@dataclass
class Verification:
    claim: str
    result: Status
    evidence: List[Evidence] = field(default_factory=list)


class AIONCore:
    """Deterministic semantic core.

    AION never treats an attempted action as proof of success.
    """

    def __init__(self) -> None:
        self.stopped = False
        self.history: List[Dict[str, Any]] = []

    def stop(self) -> None:
        self.stopped = True
        self.history.append({"event": "STOP"})

    def resume(self) -> None:
        self.stopped = False
        self.history.append({"event": "RESUME"})

    def execute(
        self,
        intention: Intention,
        capability: Capability,
        authority: Authority,
        target: str,
    ) -> Action:

        if self.stopped:
            intention.status = Status.STOPPED
            return Action(
                "AION",
                capability.name,
                target,
                status=Status.STOPPED,
            )

        if not capability.can:
            intention.status = Status.BLOCKED
            return Action(
                "AION",
                capability.name,
                target,
                status=Status.BLOCKED,
            )

        if not authority.may(capability):
            intention.status = Status.BLOCKED
            return Action(
                "AION",
                capability.name,
                target,
                status=Status.BLOCKED,
            )

        intention.status = Status.EXECUTING

        action = Action(
            "AION",
            capability.name,
            target,
        )

        self.history.append({
            "event": "ACTION",
            "action": action,
        })

        return action

    def observe(
        self,
        target: str,
        state: str,
        **facts: Any,
    ) -> Observation:

        observation = Observation(
            target,
            state,
            facts,
        )

        self.history.append({
            "event": "OBSERVATION",
            "observation": observation,
        })

        return observation

    def verify(
        self,
        intention: Intention,
        observation: Observation,
        evidence: List[Evidence],
    ) -> Verification:

        intention.status = Status.VERIFYING

        if not evidence:
            result = Status.UNVERIFIED
        elif observation.state == "satisfied":
            result = Status.COMPLETED
        else:
            result = Status.FAILED

        if result == Status.COMPLETED:
           intention.status = Status.COMPLETED
       elif result == Status.FAILED:
           intention.status = Status.FAILED
       elif result == Status.UNVERIFIED:
           intention.status = Status.UNVERIFIED
       else:
           intention.status = result

        verification = Verification(
            intention.goal,
            result,
            evidence,
        )

        self.history.append({
            "event": "VERIFICATION",
            "verification": verification,
        })

        return verification
