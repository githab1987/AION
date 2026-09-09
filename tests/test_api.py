from fastapi.testclient import TestClient
from api.index import app

client = TestClient(app)

test_api_health = lambda: client.get("/api").status_code == 200
