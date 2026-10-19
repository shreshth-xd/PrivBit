import logging
import socket
import time
from collections.abc import Callable
from typing import TypeVar


log = logging.getLogger(__name__)
T = TypeVar("T")
TRANSIENT_STATUS_CODES = {429, 500, 503, 504}


def _is_transient_error(error: BaseException) -> bool:
    seen: set[int] = set()
    current: BaseException | None = error
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        status_code = getattr(current, "status_code", None)
        if status_code is None:
            status_code = getattr(current, "code", None)
        if status_code in TRANSIENT_STATUS_CODES:
            return True
        if isinstance(current, (TimeoutError, ConnectionError, socket.timeout)):
            return True
        if any(token in type(current).__name__.lower() for token in ("timeout", "connection")):
            return True
        current = current.__cause__ or current.__context__
    return False


def retry_call(operation: Callable[[], T], operation_name: str) -> T:
    for attempt in range(1, 4):
        try:
            return operation()
        except Exception as error:
            if attempt == 3 or not _is_transient_error(error):
                raise
            delay = 2 ** (attempt - 1)
            log.warning(
                "Transient error during %s; retrying attempt %d/3 in %d seconds (%s)",
                operation_name,
                attempt + 1,
                delay,
                type(error).__name__,
            )
            time.sleep(delay)
    raise RuntimeError("Retry loop exited unexpectedly")