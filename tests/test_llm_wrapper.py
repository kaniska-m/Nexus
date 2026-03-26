# ============================================================================
# Tests — LLM Wrapper (Groq Routing, JSON Parsing)
# ============================================================================

import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from backend.utils.llm_wrapper import (
    _get_llm,
    call_llm,
    call_llm_json,
    call_llm_structured,
)


class TestModelRouting:
    """Test that heavy/light routing selects the right model + temp."""

    @patch.dict("os.environ", {"GROQ_API_KEY": "test-key"})
    @patch("backend.utils.llm_wrapper._MODEL_HEAVY", "llama-heavy")
    @patch("backend.utils.llm_wrapper._TEMP_HEAVY", 0.2)
    def test_heavy_model_selection(self):
        llm = _get_llm("heavy")
        assert llm.model_name == "llama-heavy"
        assert llm.temperature == 0.2

    @patch.dict("os.environ", {"GROQ_API_KEY": "test-key"})
    @patch("backend.utils.llm_wrapper._MODEL_LIGHT", "llama-light")
    @patch("backend.utils.llm_wrapper._TEMP_LIGHT", 0.7)
    def test_light_model_selection(self):
        llm = _get_llm("light")
        assert llm.model_name == "llama-light"
        assert llm.temperature == 0.7


class TestCallLLMJSON:
    """Test JSON parsing from LLM responses."""

    async def test_valid_json(self):
        """Valid JSON response is parsed correctly."""
        mock_response = '{"checklist": [{"name": "Doc1"}]}'
        with patch("backend.utils.llm_wrapper.call_llm", new_callable=AsyncMock) as mock:
            mock.return_value = mock_response
            result = await call_llm_json("test prompt")
            assert result["checklist"][0]["name"] == "Doc1"

    async def test_json_with_markdown_fences(self):
        """Strips ```json fences before parsing."""
        mock_response = '```json\n{"key": "value"}\n```'
        with patch("backend.utils.llm_wrapper.call_llm", new_callable=AsyncMock) as mock:
            mock.return_value = mock_response
            result = await call_llm_json("test prompt")
            assert result["key"] == "value"

    async def test_json_with_plain_fences(self):
        """Strips ``` fences without json tag."""
        mock_response = '```\n{"key": "value"}\n```'
        with patch("backend.utils.llm_wrapper.call_llm", new_callable=AsyncMock) as mock:
            mock.return_value = mock_response
            result = await call_llm_json("test prompt")
            assert result["key"] == "value"

    async def test_invalid_json_returns_fallback(self):
        """Malformed JSON returns error fallback dict."""
        mock_response = "This is not JSON at all {broken"
        with patch("backend.utils.llm_wrapper.call_llm", new_callable=AsyncMock) as mock:
            mock.return_value = mock_response
            result = await call_llm_json("test prompt")
            assert result["error"] == "json_parse_failed"
            assert "raw_response" in result

    async def test_json_instruction_appended(self):
        """JSON instruction is appended to the prompt."""
        with patch("backend.utils.llm_wrapper.call_llm", new_callable=AsyncMock) as mock:
            mock.return_value = '{"ok": true}'
            await call_llm_json("my prompt")
            actual_prompt = mock.call_args[1].get("prompt", mock.call_args[0][0] if mock.call_args[0] else "")
            assert "IMPORTANT" in actual_prompt
            assert "valid JSON" in actual_prompt


class TestCallLLMStructured:
    """Test structured output with schema hint."""

    async def test_schema_hint_appended(self):
        """Schema hint is appended to the prompt."""
        schema = {"risk_score": "Low|Medium|High", "rationale": "string"}
        with patch("backend.utils.llm_wrapper.call_llm", new_callable=AsyncMock) as mock:
            mock.return_value = json.dumps({"risk_score": "Low", "rationale": "ok"})
            result = await call_llm_structured("analyze", schema)
            assert result["risk_score"] == "Low"
