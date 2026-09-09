from typing import Any, Callable, Dict, Optional

from core.models import (
    Action,
    Evidence,
    Intention,
    Observation,
    RuntimeResult,
    Verification,
)
from core.persistence import Persistence
from core.states import (
    ActionState,
    IntentionState,
    VerificationState,
    INTENTION_TRANSITIONS,
    ACTION_TRANSITIONS,
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
        persistence: Optional[Persistence] = None,
    ):
        self.action_handler = action_handler
        self.verification_handler = verification_handler
        self.persistence = persistence

    def _save_intention(self, intention: Intention) -> None:
        if self.persistence is not None:
            self.persistence.save_intention(intention)

    def _save_action(self, action: Action) -> None:
        if self.persistence is not None:
            self.persistence.save_action(action)

    def _save_observation(
        self,
        observation: Observation,
    ) -> None:
        if self.persistence is not None:
            self.persistence.save_observation(observation)

    def _save_evidence(self, evidence: Evidence) -> None:
        if self.persistence is not None:
            self.persistence.save_evidence(evidence)

    def _save_verification(
        self,
        verification: Verification,
    ) -> None:
        if self.persistence is not None:
            self.persistence.save_verification(verification)

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
        intention.status = IntentionState.PLANNED
        self._save_intention(intention)

        require_transition(
            intention.status,
            IntentionState.EXECUTING,
            INTENTION_TRANSITIONS,
        )
        intention.status = IntentionState.EXECUTING
        self._save_intention(intention)

        require_transition(
            action.status,
            ActionState.EXECUTING,
            ACTION_TRANSITIONS,
        )
        action.status = ActionState.EXECUTING
        self._save_action(action)

        try:
            action.result = self.action_handler(action)

            require_transition(
                action.status,
                ActionState.SUCCEEDED,
                ACTION_TRANSITIONS,
            )
            action.status = ActionState.SUCCEEDED
            self._save_action(action)

        except Exception as exc:
            require_transition(
                action.status,
                ActionState.FAILED,
                ACTION_TRANSITIONS,
            )
            action.status = ActionState.FAILED

            require_transition(
                intention.status,
                IntentionState.FAILED,
                INTENTION_TRANSITIONS,
            )
            intention.status = IntentionState.FAILED

            action.result = {"error": str(exc)}

            self._save_action(action)
            self._save_intention(intention)

            return RuntimeResult(
                intention=intention,
                action=action,
            )

        require_transition(
            intention.status,
            IntentionState.OBSERVING,
            INTENTION_TRANSITIONS,
        )
        intention.status = IntentionState.OBSERVING
        self._save_intention(intention)

        self._save_observation(observation)

        for item in evidence:
            self._save_evidence(item)

        require_transition(
            intention.status,
            IntentionState.VERIFYING,
            INTENTION_TRANSITIONS,
        )
        intention.status = IntentionState.VERIFYING
        self._save_intention(intention)

        try:
            verification = self.verification_handler(
                intention,
                observation,
                evidence,
            )

        except Exception as exc:
            require_transition(
                intention.status,
                IntentionState.FAILED,
                INTENTION_TRANSITIONS,
            )
            intention.status = IntentionState.FAILED
            self._save_intention(intention)

            return RuntimeResult(
                intention=intention,
                action=action,
                observation=observation,
                evidence=evidence,
            )

        self._save_verification(verification)

        if verification.result == VerificationState.VERIFIED:
            require_transition(
                intention.status,
                IntentionState.COMPLETED,
                INTENTION_TRANSITIONS,
            )
            intention.status = IntentionState.COMPLETED

        else:
            require_transition(
                intention.status,
                IntentionState.FAILED,
                INTENTION_TRANSITIONS,
            )
            intention.status = IntentionState.FAILED

        self._save_intention(intention)

        return RuntimeResult(
            intention=intention,
            action=action,
            observation=observation,
            evidence=evidence,
            verification=verification,
        )
