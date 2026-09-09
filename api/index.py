from fastapi import FastAPI

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
