import os
from typing import Any, Dict
from uuid import uuid4

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


app = FastAPI(title="AION API", version="0.1")


@app.get("/api")
def health():
    return {
        "name": "AION",
        "version": "0.1",
        "status": "online",
    }


def action_handler(action: Action) -> Dict[str, Any]:
    return {
        "success": True,
        "action_id": action.id,
    }


def verification_handler(
    intention: Intention,
    observation: Observation,
    evidence: list[Evidence],
) -> Verification:
    return Verification(
        id=str(uuid4()),
        intention_id=intention.id,
        claim=intention.goal,
        evidence=evidence,
        result=VerificationState.VERIFIED,
        reason="smoke test verified",
    )


def build_persistence():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SECRET_KEY")

    if not supabase_url or not supabase_key:
        return None

    try:
        from supabase import create_client

        from persistence.supabase import SupabasePersistence

        client = create_client(
            supabase_url,
            supabase_key,
        )

        return SupabasePersistence(client)

    except Exception:
        return None


@app.post("/api/run")
def run_intention(payload: dict):
    try:
        intention_data = payload["intention"]
        action_data = payload["action"]
        observation_data = payload["observation"]

        evidence_data = payload.get("evidence", [])

        intention = Intention(
            id=intention_data["id"],
            goal=intention_data["goal"],
            target=intention_data.get("target"),
            constraints=intention_data.get(
                "constraints",
                [],
            ),
        )

        action = Action(
            id=action_data["id"],
            intention_id=action_data["intention_id"],
            actor=action_data["actor"],
            capability_id=action_data["capability_id"],
            target=action_data.get("target"),
            input=action_data.get(
                "input",
                {},
            ),
            expected_state=action_data.get(
                "expected_state",
                {},
            ),
        )

        observation = Observation(
            id=observation_data["id"],
            action_id=observation_data["action_id"],
            target=observation_data.get("target"),
            state=observation_data.get(
                "state",
                {},
            ),
            facts=observation_data.get(
                "facts",
                [],
            ),
            source=observation_data.get(
                "source",
                "api",
            ),
        )

        evidence = [
            Evidence(
                id=item["id"],
                observation_id=item["observation_id"],
                claim=item["claim"],
                data=item.get(
                    "data",
                    {},
                ),
                source=item.get(
                    "source",
                    "api",
                ),
                reliability=item.get(
                    "reliability"
                ),
            )
            for item in evidence_data
        ]

        engine = RuntimeEngine(
            action_handler=action_handler,
            verification_handler=verification_handler,
            persistence=build_persistence(),
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
