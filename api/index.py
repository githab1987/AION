from typing import Any, Dict

from fastapi import FastAPI, HTTPException

from core.models import (
    Action,
    Evidence,
    Intention,
    Observation,
    Verification,
)
from core.states import VerificationState
from runtime.engine import RuntimeEngine


app = FastAPI(
    title="AION API",
    version="0.1",
)


@app.get("/api")
def health():
    return {
        "name": "AION",
        "version": "0.1",
        "status": "online",
    }


def action_handler(action: Action) -> Dict[str, Any]:
    """
    Temporary deterministic handler for API -> RuntimeEngine smoke test.
    Will later be replaced by capability dispatch.
    """
    return {
        "success": True,
        "action_id": action.id,
    }


def verification_handler(
    intention: Intention,
    observation: Observation,
    evidence: list[Evidence],
) -> Verification:
    """
    Temporary deterministic verification for API bridge smoke test.
    """
    return Verification(
        intention_id=intention.id,
        claim=intention.goal,
        evidence=evidence,
        result=VerificationState.VERIFIED,
        reason="smoke test verified",
    )


@app.post("/api/run")
def run_intention(payload: dict):
    try:
        intention_data = payload["intention"]
        action_data = payload["action"]
        observation_data = payload["observation"]

        intention = Intention(
            id=intention_data["id"],
            goal=intention_data["goal"],
            target=intention_data.get("target"),
            constraints=intention_data.get("constraints", []),
        )

        action = Action(
            id=action_data["id"],
            intention_id=action_data.get(
                "intention_id",
                intention.id,
            ),
            actor=action_data["actor"],
            capability_id=action_data["capability_id"],
            target=action_data.get("target"),
            input=action_data.get("input", {}),
            expected_state=action_data.get(
                "expected_state",
                {},
            ),
        )

        observation = Observation(
            id=observation_data["id"],
            action_id=observation_data.get(
                "action_id",
                action.id,
            ),
            target=observation_data.get("target"),
            state=observation_data.get("state", {}),
            facts=observation_data.get("facts", []),
            source=observation_data.get(
                "source",
                "api",
            ),
        )

        evidence = [
            Evidence(
                id=item["id"],
                observation_id=item.get(
                    "observation_id",
                    observation.id,
                ),
                claim=item["claim"],
                data=item.get("data", {}),
                source=item.get("source", "api"),
                reliability=item.get("reliability"),
            )
            for item in payload.get("evidence", [])
        ]

        engine = RuntimeEngine(
            action_handler=action_handler,
            verification_handler=verification_handler,
        )

        result = engine.run(
            intention=intention,
            action=action,
            observation=observation,
            evidence=evidence,
        )

        return result.as_dict()

    except KeyError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required field: {exc.args[0]}",
        )
