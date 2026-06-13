"""
Lớp trừu tượng nhà cung cấp LLM (chống lock-in + fail-over).

Tất cả module AI gọi `make_client()` thay vì khởi tạo OpenAI/Groq trực tiếp.
Provider đọc từ env, nên đổi nhà cung cấp = đổi config, không sửa code:

    LLM_BASE_URL   (mặc định https://api.groq.com/openai/v1)
    LLM_API_KEY    (fallback sang GROQ_API_KEY để tương thích cũ)

Provider dự phòng (tùy chọn) — khi primary lỗi/sập, tự chuyển sang:

    LLM_FALLBACK_BASE_URL
    LLM_FALLBACK_API_KEY
    LLM_FALLBACK_MODEL   (tùy chọn; ép model id cho provider này vì id khác nhau giữa các hãng)

`make_client()` trả về object GIỮ NGUYÊN interface `client.chat.completions.create(...)`
nên call site cũ không phải đổi gì ngoài dòng khởi tạo.
"""
import os
from typing import List, Optional

import httpx
from openai import OpenAI

DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"


def _clear_proxy_env() -> None:
    """Proxy env can break the OpenAI httpx client; strip it like the old call sites did."""
    for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY"):
        os.environ.pop(key, None)


def _provider_configs() -> List[dict]:
    """Resolve ordered provider list from env. Primary first, optional fallback second."""
    providers: List[dict] = []

    primary_key = os.getenv("LLM_API_KEY") or os.getenv("GROQ_API_KEY")
    if primary_key:
        providers.append({
            "base_url": os.getenv("LLM_BASE_URL", DEFAULT_BASE_URL),
            "api_key": primary_key,
            "model_override": os.getenv("LLM_MODEL") or None,
        })

    fb_key = os.getenv("LLM_FALLBACK_API_KEY")
    fb_base = os.getenv("LLM_FALLBACK_BASE_URL")
    if fb_key and fb_base:
        providers.append({
            "base_url": fb_base,
            "api_key": fb_key,
            "model_override": os.getenv("LLM_FALLBACK_MODEL") or None,
        })

    return providers


def has_provider() -> bool:
    """True nếu có ít nhất một provider cấu hình (dùng cho guard khởi tạo)."""
    return bool(_provider_configs())


class _Completions:
    """Duck-type của client.chat.completions: .create() tự fail-over qua các provider."""

    def __init__(self, entries):
        # entries: list of (OpenAI client, model_override|None)
        self._entries = entries

    def create(self, **kwargs):
        last_err: Optional[Exception] = None
        for client, model_override in self._entries:
            try:
                call_kwargs = dict(kwargs)
                # Provider dự phòng có thể dùng id model khác → cho phép ép.
                # Primary thường để model_override=None nên giữ nguyên model mỗi call site
                # (vision cần model đa phương thức, dish/planner cần model text — không đụng).
                if model_override:
                    call_kwargs["model"] = model_override
                return client.chat.completions.create(**call_kwargs)
            except Exception as e:  # noqa: BLE001 — gom mọi lỗi để thử provider kế
                last_err = e
                continue
        if last_err is not None:
            raise last_err
        raise RuntimeError("No LLM provider available")


class _Chat:
    def __init__(self, completions):
        self.completions = completions


class FailoverClient:
    """
    Client tương thích OpenAI, gọi lần lượt các provider cho tới khi một cái thành công.
    Chỉ phơi bày `.chat.completions.create(...)` — đủ cho mọi call site hiện tại.
    """

    def __init__(self, timeout: float = 90.0):
        _clear_proxy_env()
        entries = []
        for cfg in _provider_configs():
            client = OpenAI(
                base_url=cfg["base_url"],
                api_key=cfg["api_key"],
                http_client=httpx.Client(timeout=timeout),
            )
            entries.append((client, cfg["model_override"]))
        if not entries:
            raise ValueError(
                "Chưa cấu hình provider LLM. Đặt GROQ_API_KEY (hoặc LLM_API_KEY)."
            )
        self.chat = _Chat(_Completions(entries))


def make_client(timeout: float = 90.0) -> FailoverClient:
    """Factory dùng ở mọi module AI thay cho OpenAI(base_url=..., api_key=...)."""
    return FailoverClient(timeout=timeout)
