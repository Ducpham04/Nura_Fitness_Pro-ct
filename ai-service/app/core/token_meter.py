"""
Đếm token thật của LLM (Groq) theo từng HTTP request.

Cơ chế:
- ASGI middleware (main.py) tạo 1 TokenMeter mới cho mỗi request, lưu vào ContextVar.
- Mọi call Groq đi qua llm._Completions.create() → gọi record_usage(resp.usage)
  cộng dồn vào meter của request hiện tại (cùng context, kể cả endpoint chạy threadpool).
- Middleware đọc meter sau khi handler xong → gắn vào response header X-AI-*-Tokens.
Backend đọc header này và lưu DB theo user. Không đụng vào schema response → không gây 422.
"""
import contextvars


class TokenMeter:
    __slots__ = ("prompt", "completion", "total")

    def __init__(self) -> None:
        self.prompt = 0
        self.completion = 0
        self.total = 0

    def add(self, usage) -> None:
        if usage is None:
            return
        try:
            if isinstance(usage, dict):
                p = usage.get("prompt_tokens")
                c = usage.get("completion_tokens")
                t = usage.get("total_tokens")
            else:
                p = getattr(usage, "prompt_tokens", None)
                c = getattr(usage, "completion_tokens", None)
                t = getattr(usage, "total_tokens", None)
        except Exception:
            return
        p = int(p or 0)
        c = int(c or 0)
        self.prompt += p
        self.completion += c
        self.total += int(t) if t else (p + c)


_meter: "contextvars.ContextVar[TokenMeter | None]" = contextvars.ContextVar(
    "ai_token_meter", default=None
)


def start_meter() -> TokenMeter:
    """Khởi tạo meter mới cho request hiện tại."""
    m = TokenMeter()
    _meter.set(m)
    return m


def current_meter() -> "TokenMeter | None":
    return _meter.get()


def record_usage(usage) -> None:
    """Cộng dồn usage của 1 lần gọi LLM vào meter của request hiện tại (nếu có)."""
    m = _meter.get()
    if m is not None:
        m.add(usage)
