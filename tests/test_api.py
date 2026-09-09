from fastapi.testclient import TestClient

from api.index import app


client = TestClient(app)


def test_api_health():
    response = client.get("/api")

    assert response.status_code == 200
    assert response.json() == {
        "name": "AION",
        "version": "0.1",
        "status": "online",
    }


def test_api_run():
    payload = {
        "intention": {
            "id": "intent-api-1",
            "goal": "API runtime smoke test",
        },
        "action": {
            "id": "action-api-1",
            "actor": "api",
            "capability_id": "test-capability",
        },
        "observation": {
            "id": "observation-api-1",
            "target": None,
            "state": {},
            "facts": [],
        },
        "evidence": [],
    }

    response = client.post(
        "/api/run",
        json=payload,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["intention"]["status"] == "COMPLETED"
    assert data["action"]["status"] == "SUCCEEDED"
    assert data["verification"]["result"] == "VERIFIED"
