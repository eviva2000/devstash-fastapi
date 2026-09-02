"""Run Playwright against an isolated, disposable PostgreSQL database."""

import json
import os
import shutil
import socket
import subprocess
import sys
from uuid import uuid4

from psycopg import connect, sql
from sqlalchemy.engine import URL, make_url

DATABASE_PREFIX = "devstash_test_e2e_"
DEFAULT_APPLICATION_URL = (
    "postgresql+psycopg://devstash:devstash-local-only@127.0.0.1:5432/devstash"
)
DEFAULT_ADMIN_URL = (
    "postgresql+psycopg://devstash_admin:devstash-admin-local-only"
    "@127.0.0.1:5432/postgres"
)


def _direct_url(url: URL) -> str:
    return url.set(drivername="postgresql").render_as_string(hide_password=False)


def _available_port() -> int:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


def main() -> int:
    application_url = make_url(
        os.environ.get("TEST_DATABASE_URL", DEFAULT_APPLICATION_URL)
    )
    admin_url = make_url(os.environ.get("TEST_DATABASE_ADMIN_URL", DEFAULT_ADMIN_URL))
    database_name = f"{DATABASE_PREFIX}{uuid4().hex}"
    if application_url.username is None:
        raise RuntimeError("TEST_DATABASE_URL must include the application role")

    disposable_url = application_url.set(database=database_name)
    with connect(_direct_url(admin_url), autocommit=True) as connection:
        connection.execute(
            sql.SQL("CREATE DATABASE {} OWNER {}").format(
                sql.Identifier(database_name),
                sql.Identifier(application_url.username),
            )
        )

    api_port = _available_port()
    frontend_port = _available_port()
    environment = os.environ.copy()
    environment.update(
        {
            "DATABASE_URL": disposable_url.render_as_string(hide_password=False),
            "DEVSTASH_E2E_API_PORT": str(api_port),
            "DEVSTASH_E2E_FRONTEND_PORT": str(frontend_port),
            "DEVSTASH_E2E_ISOLATED": "1",
            "TRUSTED_ORIGINS": json.dumps([f"http://127.0.0.1:{frontend_port}"]),
        }
    )
    npm = shutil.which("npm")
    if npm is None:
        raise RuntimeError("npm is required to run browser tests")

    try:
        command = [npm, "--prefix", "frontend", "run", "test:e2e:run", "--"]
        command.extend(sys.argv[1:])
        return subprocess.run(command, env=environment, check=False).returncode
    finally:
        if not database_name.startswith(DATABASE_PREFIX):
            raise RuntimeError("Refusing to remove an unexpected database")
        with connect(_direct_url(admin_url), autocommit=True) as connection:
            connection.execute(
                """
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = %s AND pid <> pg_backend_pid()
                """,
                (database_name,),
            )
            connection.execute(
                sql.SQL("DROP DATABASE {}").format(sql.Identifier(database_name))
            )


if __name__ == "__main__":
    raise SystemExit(main())
