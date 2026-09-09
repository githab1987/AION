from abc import ABC, abstractmethod
from typing import Optional

from core.models import (
    Action,
    Evidence,
    Intention,
    Observation,
    Verification,
)


class Persistence(ABC):
    """
    Abstract persistence boundary for AION.

    Runtime must not depend directly on Supabase
    or any other storage implementation.
    """

    @abstractmethod
    def save_intention(self, intention: Intention) -> None:
        pass

    @abstractmethod
    def save_action(self, action: Action) -> None:
        pass

    @abstractmethod
    def save_observation(self, observation: Observation) -> None:
        pass

    @abstractmethod
    def save_evidence(self, evidence: Evidence) -> None:
        pass

    @abstractmethod
    def save_verification(self, verification: Verification) -> None:
        pass

    @abstractmethod
    def get_intention(self, intention_id: str) -> Optional[Intention]:
        pass

    @abstractmethod
    def get_action(self, action_id: str) -> Optional[Action]:
        pass

    @abstractmethod
    def get_observation(
        self,
        observation_id: str,
    ) -> Optional[Observation]:
        pass
