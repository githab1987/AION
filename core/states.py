from enum import Enum


class IntentionState(str, Enum):
    DECLARED = "DECLARED"
    PLANNED = "PLANNED"
    EXECUTING = "EXECUTING"
    OBSERVING = "OBSERVING"
    VERIFYING = "VERIFYING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ActionState(str, Enum):
    PLANNED = "PLANNED"
    EXECUTING = "EXECUTING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class VerificationState(str, Enum):
    UNKNOWN = "UNKNOWN"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


INTENTION_TRANSITIONS = {
    IntentionState.DECLARED: {
        IntentionState.PLANNED,
        IntentionState.FAILED,
    },
    IntentionState.PLANNED: {
        IntentionState.EXECUTING,
        IntentionState.FAILED,
    },
    IntentionState.EXECUTING: {
        IntentionState.OBSERVING,
        IntentionState.FAILED,
    },
    IntentionState.OBSERVING: {
        IntentionState.VERIFYING,
        IntentionState.FAILED,
    },
    IntentionState.VERIFYING: {
        IntentionState.COMPLETED,
        IntentionState.FAILED,
    },
    IntentionState.COMPLETED: set(),
    IntentionState.FAILED: set(),
}


ACTION_TRANSITIONS = {
    ActionState.PLANNED: {
        ActionState.EXECUTING,
        ActionState.FAILED,
    },
    ActionState.EXECUTING: {
        ActionState.SUCCEEDED,
        ActionState.FAILED,
    },
    ActionState.SUCCEEDED: set(),
    ActionState.FAILED: set(),
}


VERIFICATION_TRANSITIONS = {
    VerificationState.UNKNOWN: {
        VerificationState.VERIFIED,
        VerificationState.REJECTED,
    },
    VerificationState.VERIFIED: set(),
    VerificationState.REJECTED: set(),
}


def can_transition(
    current_state: Enum,
    next_state: Enum,
    transitions: dict,
) -> bool:
    return next_state in transitions.get(current_state, set())


def require_transition(
    current_state: Enum,
    next_state: Enum,
    transitions: dict,
) -> None:
    if not can_transition(current_state, next_state, transitions):
        raise ValueError(
            f"Invalid state transition: "
            f"{current_state.value} -> {next_state.value}"
        )
