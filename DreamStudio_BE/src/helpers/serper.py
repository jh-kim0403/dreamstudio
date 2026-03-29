import requests

from src.config import settings

SERPER_PATH = "/images"
DEFAULT_TIMEOUT_SECONDS = 20
_session = requests.Session()


class SerperError(Exception):
    pass


def _serper_url() -> str:
    return f"{settings.serper_base_url.rstrip('/')}{SERPER_PATH}"


def reverse_image_search(image_url: str, timeout: int = DEFAULT_TIMEOUT_SECONDS) -> dict:
    if not settings.serper_api_key:
        raise SerperError("SERPER_API_KEY is not configured")

    try:
        response = _session.post(
            _serper_url(),
            headers={
                "X-API-KEY": settings.serper_api_key,
                "Content-Type": "application/json",
            },
            json={"imageUrl": image_url},
            timeout=timeout,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise SerperError(f"Serper request failed: {exc}") from exc

    try:
        return response.json()
    except ValueError as exc:
        raise SerperError("Serper response was not valid JSON") from exc
