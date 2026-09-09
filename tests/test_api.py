from fastapi.testclient import TestClient
from api.index import app

client = TestClient(app)

def test_api_health():
assert client.get("/api").status_code == 200
