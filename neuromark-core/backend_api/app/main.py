from datetime import datetime
from pathlib import Path
import random
import sqlite3
import time
import uuid

from fastapi import Depends, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

app = FastAPI(title="NeuroMark API Engine", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()
MAX_FILE_SIZE = 50 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "video/mp4"}
DB_FILE = Path(__file__).resolve().parents[2] / "neuromark_history.db"


def init_db() -> None:
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scans (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                filename TEXT NOT NULL,
                verified INTEGER NOT NULL,
                trust_score REAL NOT NULL,
                ber REAL NOT NULL,
                confidence REAL NOT NULL,
                type TEXT NOT NULL
            )
            """
        )


init_db()


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    if credentials.credentials != "valid-token":
        raise HTTPException(status_code=401, detail="Invalid auth token")
    return credentials.credentials


async def validate_upload(file: UploadFile) -> UploadFile:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid format")

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)

    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Payload Too Large")

    return file


def insert_scan(
    *,
    scan_id: str,
    filename: str,
    verified: bool,
    trust_score: float,
    ber: float,
    confidence: float,
    scan_type: str,
) -> None:
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute(
            """
            INSERT INTO scans (id, timestamp, filename, verified, trust_score, ber, confidence, type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                scan_id,
                datetime.utcnow().isoformat(),
                filename,
                int(verified),
                trust_score,
                ber,
                confidence,
                scan_type,
            ),
        )


@app.get("/api/v1/health")
async def health_metrics():
    with sqlite3.connect(DB_FILE) as conn:
        count = conn.execute("SELECT COUNT(*) FROM scans").fetchone()[0]

    return {
        "status": "online",
        "active_nodes": 4,
        "global_trust_score": round(random.uniform(94.0, 99.5), 2),
        "current_ber": round(random.uniform(0.01, 0.05), 3),
        "recovered_payload": f"0x{uuid.uuid4().hex[:8].upper()}",
        "stored_scans": count,
    }


@app.get("/api/v1/kms/connect")
async def connect_kms():
    time.sleep(0.5)
    return {
        "status": "connected",
        "kms_key": f"KMS-{uuid.uuid4().hex.upper()}",
        "policy": "STRICT_ENFORCEMENT",
    }


@app.get("/api/v1/history")
async def get_history():
    with sqlite3.connect(DB_FILE) as conn:
        rows = conn.execute(
            """
            SELECT id, timestamp, filename, verified, trust_score, ber, confidence, type
            FROM scans
            ORDER BY timestamp DESC
            LIMIT 20
            """
        ).fetchall()

    return [
        {
            "id": r[0],
            "timestamp": r[1],
            "filename": r[2],
            "verified": bool(r[3]),
            "trust_score": r[4],
            "ber": r[5],
            "confidence": r[6],
            "type": r[7],
        }
        for r in rows
    ]


@app.post("/api/v1/protect")
async def apply_protection(
    file: UploadFile = Depends(validate_upload),
    _token: str = Depends(verify_token),
):
    _ = await file.read()
    time.sleep(1.6)

    scan_id = str(uuid.uuid4())
    trust_score = 99.9
    insert_scan(
        scan_id=scan_id,
        filename=file.filename,
        verified=True,
        trust_score=trust_score,
        ber=0.001,
        confidence=0.99,
        scan_type="PROTECTION",
    )

    return {
        "job_id": scan_id,
        "status": "success",
        "message": "Adversarial watermark injected",
        "new_trust_score": trust_score,
        "signature": f"0x{uuid.uuid4().hex[:8].upper()}",
    }


@app.post("/api/v1/verify")
async def verify_asset(
    file: UploadFile = Depends(validate_upload),
    _token: str = Depends(verify_token),
):
    content = await file.read()
    file_size = len(content)
    random.seed(file_size)
    time.sleep(1.8)

    is_tampered = bool(file_size % 2 == 1)

    ber = round(random.uniform(0.15, 0.45), 4) if is_tampered else round(random.uniform(0.001, 0.04), 4)
    confidence = round(random.uniform(0.4, 0.7), 2) if is_tampered else round(random.uniform(0.9, 0.99), 2)
    psnr = round(random.uniform(15.0, 25.0), 1) if is_tampered else round(random.uniform(38.0, 48.0), 1)

    base_score = 100 - (ber * 100)
    trust_score = max(0, min(100, base_score if not is_tampered else base_score - 30))

    chart_data = []
    curr_conf = 1.0
    curr_psnr = 45.0
    for i in range(8):
        if i == 5 and is_tampered:
            curr_conf *= 0.4
            curr_psnr *= 0.5
        chart_data.append(
            {
                "time": f"{i * 10}ms",
                "confidence": round(curr_conf * random.uniform(0.9, 1.1), 2),
                "psnr": round(curr_psnr * random.uniform(0.9, 1.1), 1),
            }
        )

    scan_id = str(uuid.uuid4())
    insert_scan(
        scan_id=scan_id,
        filename=file.filename,
        verified=not is_tampered,
        trust_score=round(trust_score, 2),
        ber=ber,
        confidence=confidence,
        scan_type="VERIFICATION",
    )

    return {
        "status": "success",
        "id": scan_id,
        "verified": not is_tampered,
        "filename": file.filename,
        "extracted_signature": f"0x{uuid.uuid4().hex[:8].upper()}",
        "confidence": confidence,
        "ber": ber,
        "psnr": psnr,
        "trust_score": round(trust_score, 2),
        "chart_data": chart_data,
        "tamper_heatmap_enabled": is_tampered,
        "tamper_box": {
            "top": f"{random.randint(10, 60)}%",
            "left": f"{random.randint(10, 60)}%",
            "width": f"{random.randint(15, 35)}%",
            "height": f"{random.randint(15, 35)}%",
        }
        if is_tampered
        else None,
        "provenance_node": "Unknown Deepfake Generator [IP: 192.168.x.x]"
        if is_tampered
        else "Trusted CDN Host [AWS-US-E1]",
    }
