"""LLMClient: tries the custom Claude-backed API first, falls back to Azure OpenAI GPT-4o."""

from __future__ import annotations

import json

import httpx

from app.clients.tracing import span
from app.config import get_settings


class LLMError(Exception):
    """Raised when neither the custom LLM API nor the Azure fallback can serve a request."""


class LLMClient:
    def __init__(self) -> None:
        self._settings = get_settings()

    def complete(self, system: str, user: str, json_mode: bool = False) -> str:
        query = f"{system}\n\n{user}"
        if json_mode:
            query += "\n\nRespond with raw JSON only. No markdown fences, no prose, no explanation."

        if self._settings.custom_llm_configured:
            try:
                model = self._settings.llm_model or self._settings.config.llm.model
                with span("llm.complete", as_type="generation", input=query, provider="custom", model=model) as obs:
                    answer = self._call_custom(query)
                    obs.update(output=answer)
                    return answer
            except Exception as exc:
                if not self._settings.azure_configured:
                    raise LLMError(
                        f"custom LLM call failed and no Azure fallback configured: {exc}"
                    ) from exc
        elif not self._settings.azure_configured:
            raise LLMError("no LLM provider configured: set LLM_BASE_URL/LLM_API_KEY or Azure OpenAI keys")

        with span(
            "llm.complete", as_type="generation", input=query, provider="azure", model=self._settings.azure_openai_deployment
        ) as obs:
            answer = self._call_azure(system, user, json_mode)
            obs.update(output=answer)
            return answer

    def _call_custom(self, query: str) -> str:
        """Adapter for the user's custom Claude-backed API. Adjust here if the API shape changes.

        Request:  POST {LLM_BASE_URL} {"query", "model", "thinking", "effort"}, Bearer auth.
        Response: {"success": bool, "answer": str, "exit_code": int, "stderr": str, ...}
        """
        settings = self._settings
        llm_cfg = settings.config.llm
        model = settings.llm_model or llm_cfg.model

        response = httpx.post(
            settings.llm_base_url.strip(),
            # .strip() guards against a trailing newline/space sneaking into the .env
            # value (e.g. from copy-paste) — the custom API does an exact string
            # match on "Bearer <key>", so stray whitespace silently causes a 401.
            headers={"Authorization": f"Bearer {settings.llm_api_key.strip()}"},
            json={
                "query": query,
                "model": model,
                "thinking": llm_cfg.thinking,
                "effort": llm_cfg.effort,
            },
            timeout=llm_cfg.timeout_seconds,
        )
        response.raise_for_status()
        body = response.json()

        if not body.get("success", False) or body.get("exit_code", 0) != 0:
            raise RuntimeError(f"custom LLM API reported failure: {body.get('stderr') or body.get('answer')}")

        answer = body.get("answer")
        if not answer:
            raise RuntimeError("custom LLM API returned an empty answer")
        if not isinstance(answer, str):
            # The custom server sometimes parses the JSON itself and returns the
            # object directly in `answer` instead of a JSON string (observed with
            # "Respond with raw JSON only" prompts). Every caller expects a str
            # and does its own json.loads() — round-trip through json.dumps so
            # both response shapes look identical downstream.
            answer = json.dumps(answer)
        return answer

    def _call_azure(self, system: str, user: str, json_mode: bool) -> str:
        settings = self._settings
        url = (
            f"{settings.azure_openai_endpoint.rstrip('/')}/openai/deployments/"
            f"{settings.azure_openai_deployment}/chat/completions"
            f"?api-version={settings.azure_openai_api_version}"
        )
        payload: dict = {
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        response = httpx.post(
            url,
            headers={"api-key": settings.azure_openai_api_key},
            json=payload,
            timeout=settings.config.llm.timeout_seconds,
        )
        response.raise_for_status()
        body = response.json()
        return body["choices"][0]["message"]["content"]

    def health(self) -> dict:
        """Pings each configured provider independently. Never raises."""
        settings = self._settings
        result: dict = {}

        if settings.custom_llm_configured:
            try:
                self._call_custom("Reply with only the word ok.")
                result["custom"] = "ok"
            except Exception as exc:
                result["custom"] = f"error: {exc}"
        else:
            result["custom"] = "not configured"

        if settings.azure_configured:
            try:
                self._call_azure(system="Reply with only the word ok.", user="ping", json_mode=False)
                result["azure"] = "ok"
            except Exception as exc:
                result["azure"] = f"error: {exc}"
        else:
            result["azure"] = "not configured"

        result["healthy"] = result["custom"] == "ok" or result["azure"] == "ok"
        return result
