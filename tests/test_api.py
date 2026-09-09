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
"goal": "test api run",
"target": "system",
"constraints": [],
},
"action": {
"id": "action-api-1",
"intention_id": "intent-api-1",
"actor": "api-test",
"capability_id": "test-capability",
"target": "system",
"input": {},
"expected_state": {
"success": True,
},
},
"observation": {
"id": "observation-api-1",
"action_id": "action-api-1",
"target": "system",
"state": {
"success": True,
},
"facts": [
"action succeeded",
],
"source": "api-test",
},
"evidence": [
{
"id": "evidence-api-1",
"observation_id": "observation-api-1",
"claim": "action succeeded",
"data": {
"success": True,
},
"source": "api-test",
"reliability": 1.0,
}
],
}

response = client.post(
    "/api/run",
    json=payload,
)

assert response.status_code == 200

data = response.json()

assert data["intention"]["id"] == "intent-api-1"
assert data["intention"]["status"] == "COMPLETED"

assert data["action"]["id"] == "action-api-1"
assert data["action"]["status"] == "SUCCEEDED"

assert data["observation"]["id"] == "observation-api-1"

assert data["verification"]["result"] == "VERIFIED"
assert data["verification"]["claim"] == "test api run"
assert data["verification"]["evidence_count"] == 1
