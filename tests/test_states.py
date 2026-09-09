import pytest

from core.states import (
    ActionState,
    IntentionState,
    VerificationState,
    can_transition,
    INTENTION_TRANSITIONS,
    ACTION_TRANSITIONS,
    VERIFICATION_TRANSITIONS,
)


def test_intention_valid_transition():
    assert can_transition(
        IntentionState.DECLARED,
        IntentionState.PLANNED,
        INTENTION_TRANSITIONS,
    )


def test_intention_invalid_transition():
    assert not can_transition(
        IntentionState.DECLARED,
        IntentionState.COMPLETED,
        INTENTION_TRANSITIONS,
    )


def test_action_valid_transition():
    assert can_transition(
        ActionState.PLANNED,
        ActionState.EXECUTING,
        ACTION_TRANSITIONS,
    )


def test_action_invalid_transition():
    assert not can_transition(
        ActionState.PLANNED,
        ActionState.SUCCEEDED,
        ACTION_TRANSITIONS,
    )


def test_verification_valid_transition():
    assert can_transition(
        VerificationState.UNKNOWN,
        VerificationState.VERIFIED,
        VERIFICATION_TRANSITIONS,
    )


def test_verification_invalid_transition():
    assert not can_transition(
        VerificationState.UNKNOWN,
        VerificationState.UNKNOWN,
        VERIFICATION_TRANSITIONS,
    )
