import os
from redis import Redis
from rq import Queue

REDIS_URL = os.getenv("REDIS_URL")
if not REDIS_URL:
    raise RuntimeError("REDIS_URL environment variable is not set")

redis_conn = Redis.from_url(REDIS_URL)
job_queue = Queue("privbit", connection=redis_conn)