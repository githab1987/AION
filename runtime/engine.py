from typing import Any, Callable, Dict, Optional

from core.models import (
    Action,
    Evidence,
    Intention,
    Observation,
    RuntimeResult,
    Verification,
)
from core.states import (
    ActionState,
    IntentionState,
    VerificationState,
    INTENTION_TRANSITIONS,
    ACTION_TRANSITIONS,
    VERIFICATION_TRANSITIONS,
    require_transition,
)


class RuntimeEngine:
    def __init__(
        self,
        action_handler: Callable[[Action], Dict[str, Any]],
        verification_handler: Callable[
            [Intention, Observation, list[Evidence]],
            Verification,
        ],
    ):
        self.action_handler = action_handler
        self.verification_handler = verification_handler

    def run(
        self,
        intention: Intention,
        action: Action,
        observation: Observation,
        evidence: Optional[list[Evidence]] = None,
    ) -> RuntimeResult:
        evidence = evidence or []

        require_transition(
            intention.status,
            IntentionState.PLANNED,
            INTENTION_TRANSITIONS,
        )
                IntentionState.DECLARED: {
                    IntentionState.PLANNED,
                    IntentionState.FAILED,
                }
            },
        )
        intention.status = IntentionState.PLANNED

        require_transition(
            intention.status,
            IntentionState.EXECUTING,
            INTENTION_TRANSITIONS,
        )
                IntentionState.PLANNED: {
                    IntentionState.EXECUTING,
                    IntentionState.FAILED,
                }
            },
        )
        intention.status = IntentionState.EXECUTING

        require_transition(
            action.status,
            ActionState.EXECUTING,
            ACTION_TRANSITIONS,
        )
                ActionState.PLANNED: {
                    ActionState.EXECUTING,
                    ActionState.FAILED,
                }
            },
        )
        action.status = ActionState.EXECUTING

        try:
            action.result = self.action_handler(action)
            action.status = ActionState.SUCCEEDED
        except Exception as exc:
            action.status = ActionState.FAILED
            intention.status = IntentionState.FAILED
            action.result = {"error": str(exc)}

            return RuntimeResult(
                intention=intention,
                action=action,
            )

        require_transition(
            intention.status,
            IntentionState.OBSERVING,
            INTENTION_TRANSITIONS,
        )
                IntentionState.EXECUTING: {
                    IntentionState.OBSERVING,
                    IntentionState.FAILED,
                }
            },
        )
        intention.status = IntentionState.OBSERVING

        require_transition(
            intention.status,
            IntentionState.VERIFYING,
            INTENTION_TRANSITIONS,
       )
                IntentionState.OBSERVING: {
                    IntentionState.VERIFYING,
                    IntentionState.FAILED,
                }
            },
        )
        intention.status = IntentionState.VERIFYING

        verification = self.verification_handler(
            intention,
            observation,
            evidence,
        )

        if verification.result == VerificationState.VERIFIED:
            intention.status = IntentionState.COMPLETED
        else:
            intention.status = IntentionState.FAILED

        return RuntimeResult(
            intention=intention,
            action=action,
            observation=observation,
            evidence=evidence,
            verification=verification,
        )
