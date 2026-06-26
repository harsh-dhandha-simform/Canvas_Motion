#!/usr/bin/env python3

import json
import logging
import subprocess
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os

PORT = 8080

# Max seconds to let the `claude` CLI run per request. Opus with thinking on
# large prompts (e.g. the Director) routinely needs >120s, so default high and
# allow override. Restart the server after changing this.
CLAUDE_TIMEOUT = int(os.getenv("CLAUDE_TIMEOUT", "600"))

API_KEY = os.getenv("API_KEY", "sfrgf54vdfvdsfvsdf9sd2fe3sfs8cdsdceAWSdaewd5dd2")
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

        cmd = ["claude", "-p", query]

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
            timeout=CLAUDE_TIMEOUT,
        )

        duration = round(time.time() - start, 2)

        return {
            "success": result.returncode == 0,
            "answer": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "exit_code": result.returncode,
            "duration": duration,
        }

    except subprocess.TimeoutExpired:

        duration = round(time.time() - start, 2)

        return {
            "success": False,
            "answer": "",
            "stderr": f"Claude timed out after {CLAUDE_TIMEOUT} seconds.",
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
    # POST
    # -------------------------------------------------------------------------

    def do_POST(self):

        if self.path != "/ask":
            self.send_error(404)
            return

        request_id = str(uuid.uuid4())[:8]

        # -------------------------------------------------------------
        # API Key Authentication
        # -------------------------------------------------------------

        if not is_authorized(self.headers):

            payload = json.dumps(
                {
                    "success": False,
                    "error": "Unauthorized",
                }
            ).encode()

            self.send_response(401)
            self.send_header(
                "Content-Type",
                "application/json",
            )
            self.send_header(
                "Content-Length",
                str(len(payload)),
            )
            self.send_header(
                "WWW-Authenticate",
                "Bearer",
            )
            self.end_headers()
            self.wfile.write(payload)
            return

        try:

            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length)

            try:
                body = json.loads(raw.decode("utf-8") if raw else "{}")
            except json.JSONDecodeError:
                self.send_error(400, "Invalid JSON")
                return

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
    logger.info("Endpoint     : POST /ask")
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