#!/usr/bin/env python3
 
# from deepgram.listen.v1.requests import listen_v1results_channel_alternatives_item_words_item
import json
import logging
import subprocess
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os

from dotenv import load_dotenv

from interactive_learning.demo_challenges import DEMO_CHALLENGES
from interactive_learning.chapters import CHAPTER_CHALLENGES
from interactive_learning.session_store import InMemorySessionStore

load_dotenv()

PORT = 8080


API_KEY = os.environ.get("API_KEY")
if not API_KEY:
    raise RuntimeError(
        "API_KEY is not set. Copy .env.example to .env and fill in API_KEY "
        "before running this server."
    )

# Set ENABLE_HARDCODED_CHAPTERS=0 to turn off the tests/hardcore.md chapter
# challenges without touching any code - e.g. if a demo only wants the
# original 5 generic demo challenges.
ENABLE_HARDCODED_CHAPTERS = os.environ.get("ENABLE_HARDCODED_CHAPTERS", "1") != "0"

# Ground truth for /validate is looked up here by challenge_id and never
# accepted from the request body - the frontend must never see it. Seeded
# with the same 5 demo challenges the visualizer displays (Phase 5, wiring
# this to real generated challenges, is not done - see state.md).
_SESSION_STORE = InMemorySessionStore()
for _demo_challenge, _demo_ground_truth in DEMO_CHALLENGES:
    _SESSION_STORE.create_session(_demo_challenge, _demo_ground_truth)

if ENABLE_HARDCODED_CHAPTERS:
    for _chapter_challenge, _chapter_ground_truth in CHAPTER_CHALLENGES:
        _SESSION_STORE.create_session(_chapter_challenge, _chapter_ground_truth)
# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
 
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler("ask_server.log"),
        logging.StreamHandler(),
    ],
)
 
logger = logging.getLogger("claude-http")
 
 
# -----------------------------------------------------------------------------
# Claude
# -----------------------------------------------------------------------------
 
def ask_claude(
    query: str,
    model: str | None = None,
    thinking: str | None = None,
    effort: str | None = None,
):
    start = time.time()
 
    try:
 
        cmd = ["claude","-p",query]
 
        # Optional model
        if model:
            cmd.extend(["--model", model])
 
        # Optional thinking
        if thinking is not None:
            cmd.extend(["--thinking",thinking])
 
        # Optional effort
        if effort:
            cmd.extend(["--effort", effort])
 
        logger.info("Claude CMD : %s", " ".join(cmd))
 
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
        )
 
        duration = round(time.time() - start, 2)
 
        stdout = result.stdout.strip()
 
        try:
            parsed_output = json.loads(stdout) if stdout else {}
        except json.JSONDecodeError:
            parsed_output = {
                "raw_output": stdout
            }
 
        return {
            "success": result.returncode == 0,
            "answer": parsed_output,
            "stderr": result.stderr.strip(),
            "exit_code": result.returncode,
            "duration": duration,
        }
 
    except subprocess.TimeoutExpired:
 
        duration = round(time.time() - start, 2)
 
        return {
            "success": False,
            "answer": "",
            "stderr": "Claude timed out after 120 seconds.",
            "exit_code": -1,
            "duration": duration,
        }
 
    except Exception as e:
 
        duration = round(time.time() - start, 2)
 
        return {
            "success": False,
            "answer": "",
            "stderr": str(e),
            "exit_code": -1,
            "duration": duration,
        }
 
 
# -----------------------------------------------------------------------------
# HTTP
# -----------------------------------------------------------------------------
 
def is_authorized(headers):
 
    auth = headers.get("Authorization")
 
    if not auth:
        return False
 
    expected = f"Bearer {API_KEY}"
 
    return auth == expected
 
class Handler(BaseHTTPRequestHandler):
 
    # -------------------------------------------------------------------------
    # CORS
    # -------------------------------------------------------------------------
 
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
        )
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
        )
        self.send_header("Access-Control-Max-Age", "86400")
        super().end_headers()
 
    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    # -------------------------------------------------------------------------
    # Shared response helper
    # -------------------------------------------------------------------------

    def _write_json(self, status, payload_dict):
        payload = json.dumps(payload_dict, indent=2, ensure_ascii=False).encode("utf-8")

        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    # -------------------------------------------------------------------------
    # POST
    # -------------------------------------------------------------------------

    def do_POST(self):

        if self.path not in ("/ask", "/validate", "/hint"):
            self.send_error(404)
            return

        request_id = str(uuid.uuid4())[:8]

        # -------------------------------------------------------------
        # API Key Authentication
        # -------------------------------------------------------------

        if not is_authorized(self.headers):
            self._write_json(401, {"success": False, "error": "Unauthorized"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length)

            try:
                body = json.loads(raw.decode("utf-8") if raw else "{}")
            except json.JSONDecodeError:
                self.send_error(400, "Invalid JSON")
                return

            if self.path == "/validate":
                self._handle_validate(request_id, body)
            elif self.path == "/hint":
                self._handle_hint(request_id, body)
            else:
                self._handle_ask(request_id, body)

        except Exception as e:
            logger.exception("Unhandled Exception")
            self._write_json(500, {"success": False, "error": str(e)})

    # -------------------------------------------------------------------------
    # /validate - deterministic validation (interactive_learning.validation)
    # -------------------------------------------------------------------------

    def _handle_validate(self, request_id, body):
        from interactive_learning import validation

        challenge_id = body.get("challenge_id")
        user_attempt = body.get("user_attempt")

        if not challenge_id or not isinstance(user_attempt, dict):
            self._write_json(
                400,
                {"success": False, "error": "Missing 'challenge_id' or 'user_attempt'"},
            )
            return

        try:
            session = _SESSION_STORE.get_session(challenge_id)
        except KeyError:
            self._write_json(404, {"success": False, "error": f"Unknown challenge_id: {challenge_id!r}"})
            return

        challenge_type = session["challenge"]["challenge_type"]
        ground_truth = session["ground_truth"]

        try:
            result = validation.validate(challenge_type, ground_truth, user_attempt)
        except validation.ValidationError as e:
            self._write_json(400, {"success": False, "error": str(e)})
            return

        _SESSION_STORE.record_attempt(challenge_id, user_attempt, result)

        self._write_json(
            200,
            {
                "request_id": request_id,
                "success": True,
                "result": result,
                "attempt_number": _SESSION_STORE.attempt_count(challenge_id),
            },
        )

    # -------------------------------------------------------------------------
    # /hint - LLM hint generator (interactive_learning.hints)
    # -------------------------------------------------------------------------

    def _handle_hint(self, request_id, body):
        from interactive_learning import hints

        challenge_id = body.get("challenge_id")
        mistakes = body.get("mistakes")

        if not challenge_id or not isinstance(mistakes, dict):
            self._write_json(
                400,
                {"success": False, "error": "Missing 'challenge_id' or 'mistakes'"},
            )
            return

        try:
            session = _SESSION_STORE.get_session(challenge_id)
        except KeyError:
            self._write_json(404, {"success": False, "error": f"Unknown challenge_id: {challenge_id!r}"})
            return

        challenge = session["challenge"]

        if not mistakes:
            self._write_json(
                200,
                {
                    "request_id": request_id,
                    "success": True,
                    "hint": None,
                    "response": hints.generate_success_response(),
                },
            )
            return

        try:
            hint_text = hints.generate_hint(challenge, mistakes)
        except Exception as e:
            logger.error("hint generation failed: %s", e)
            self._write_json(502, {"success": False, "error": str(e)})
            return

        self._write_json(200, {"request_id": request_id, "success": True, "hint": hint_text})

    # -------------------------------------------------------------------------
    # /ask - raw Claude CLI bridge (unchanged behavior)
    # -------------------------------------------------------------------------

    def _handle_ask(self, request_id, body):
        try:

            # -------------------------------------------------------------
            # Request fields
            # -------------------------------------------------------------

            query = body.get("query", "").strip()
            model = body.get("model")
            thinking = body.get("thinking")
            effort = body.get("effort")
 
            if not query:
                self.send_error(400, "Missing 'query'")
                return
 
            # Validate thinking
            valid_thinking = {
                "enabled",
                "adaptive",
                "disabled",
            }
 
            if thinking is not None:
                if not isinstance(thinking, str):
                    self.send_error(
                        400,
                        "'thinking' must be a string"
                    )
                    return
  
                thinking = thinking.lower()
 
                if thinking not in valid_thinking:
                    self.send_error(
                        400,
                        "thinking must be one of: enabled, adaptive, disabled"
                    )
                    return
 
            logger.info("=" * 90)
            logger.info("Authenticated : YES")
            logger.info("Request ID : %s", request_id)
            logger.info("Client IP  : %s", self.client_address[0])
            logger.info("Endpoint   : %s", self.path)
            logger.info("Query      : %s", query)
            logger.info("Model      : %s", model or "default")
            logger.info("Thinking   : %s",thinking if thinking else "<default>")
            logger.info("Effort     : %s", effort or "default")
 
            result = ask_claude(
                query=query,
                model=model,
                thinking=thinking,
                effort=effort,
            )
 
            logger.info("Success    : %s", result["success"])
            logger.info("Exit Code  : %s", result["exit_code"])
            logger.info("Duration   : %.2f sec", result["duration"])
 
            if result["stderr"]:
                logger.error("stderr     : %s", result["stderr"])
 
            logger.info("=" * 90)
 
            response = {
                "request_id": request_id,
                "success": result["success"],
                "query": query,
                "model": model,
                "thinking": thinking,
                "effort": effort,
                "answer": result["answer"],
                "stderr": result["stderr"],
                "duration_seconds": result["duration"],
                "exit_code": result["exit_code"],
            }
 
            payload = json.dumps(
                response,
                indent=2,
                ensure_ascii=False,
            ).encode("utf-8")
 
            self.send_response(200)
            self.send_header(
                "Content-Type",
                "application/json"
            )
            self.send_header(
                "Content-Length",
                str(len(payload))
            )
            self.end_headers()
            self.wfile.write(payload)
 
        except Exception as e:
 
            logger.exception("Unhandled Exception")
 
            payload = json.dumps(
                {
                    "success": False,
                    "error": str(e),
                }
            ).encode()
 
            self.send_response(500)
            self.send_header(
                "Content-Type",
                "application/json"
            )
            self.send_header(
                "Content-Length",
                str(len(payload))
            )
            self.end_headers()
            self.wfile.write(payload)
 
    def log_message(self, format, *args):
        # Disable default HTTP logs
        return
 
 
# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
 
if __name__ == "__main__":
 
    logger.info("")
    logger.info("=" * 90)
    logger.info("Claude Headless HTTP Server")
    logger.info("Listening on : http://0.0.0.0:%d", PORT)
    logger.info("Endpoints    : POST /ask, POST /validate, POST /hint")
    logger.info("Auth         : Bearer API Key")
    logger.info("CORS         : ENABLED (*)")
    logger.info("Log File     : ask_server.log")
    logger.info("=" * 90)
 
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
 
    try:
        server.serve_forever()
 
    except KeyboardInterrupt:
        logger.info("Stopping server...")
        server.server_close()
