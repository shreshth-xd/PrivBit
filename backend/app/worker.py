from rq import Worker
from app.core.queue import redis_conn, job_queue

if __name__ == "__main__":
    worker = Worker([job_queue], connection=redis_conn)
    worker.work()
