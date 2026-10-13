from pathlib import Path

from dotenv import load_dotenv

import os
from redis import Redis
from rq import Queue

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

REDIS_URL = os.getenv("REDIS_URL")
if not REDIS_URL:
    raise RuntimeError("REDIS_URL environment variable is not set")

redis_conn = Redis.from_url(REDIS_URL)
job_queue = Queue("privbit", connection=redis_conn)