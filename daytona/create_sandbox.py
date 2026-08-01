#!/usr/bin/env python3
"""
Provision a Daytona sandbox for Women's Health Navigator backend.

Usage:
    export DAYTONA_API_KEY=your_daytona_key
    export CEREBRAS_API_KEY=your_cerebras_key
    python daytona/create_sandbox.py <git-repo-url> [github-token]

The github-token is required for private repos (use a GitHub personal access token).
Prints a signed preview URL for the backend port once the sandbox is healthy.
"""

import os
import sys
import time

try:
    from daytona import Daytona, CreateSandboxFromSnapshotParams, CodeLanguage
except ImportError:
    print("ERROR: daytona SDK not installed. Run: pip install -r daytona/requirements.txt")
    sys.exit(1)


BACKEND_PORT = int(os.environ.get("PORT", 8787))
REPO_PATH = "women-health-navigator"
PREVIEW_TTL_SECONDS = 3600  # 1 hour


def main():
    if len(sys.argv) < 2:
        print(f"Usage: python {sys.argv[0]} <git-repo-url> [github-token]")
        sys.exit(1)

    repo_url = sys.argv[1]
    github_token = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("GITHUB_TOKEN")

    cerebras_api_key = os.environ.get("CEREBRAS_API_KEY")
    if not cerebras_api_key:
        print("ERROR: CEREBRAS_API_KEY environment variable not set.")
        sys.exit(1)

    # Daytona reads DAYTONA_API_KEY from env automatically
    client = Daytona()

    print("Creating Daytona sandbox...")
    sandbox = client.create(
        CreateSandboxFromSnapshotParams(
            language=CodeLanguage.JAVASCRIPT,
            auto_stop_interval=60,
        )
    )
    print(f"Sandbox created: {sandbox.id}")

    # Clone the repo into the sandbox
    print(f"Cloning repo: {repo_url}")
    sandbox.git.clone(
        url=repo_url,
        path=REPO_PATH,
        username="x-token" if github_token else None,
        password=github_token if github_token else None,
    )
    print("Repo cloned.")

    # Run setup script — passes Cerebras key as env var, no Ollama needed
    print("Running setup.sh...")
    result = sandbox.process.exec(
        "bash daytona/setup.sh",
        cwd=REPO_PATH,
        env={
            "PORT": str(BACKEND_PORT),
            "CEREBRAS_API_KEY": cerebras_api_key,
            "CEREBRAS_MODEL": os.environ.get("CEREBRAS_MODEL", "gemma-4-31b"),
        },
        timeout=120,
    )
    if result.exit_code != 0:
        print(f"ERROR: setup.sh failed (exit {result.exit_code})")
        print(result.result)
        sys.exit(1)
    print(result.result)

    # Generate signed preview URL
    time.sleep(2)
    preview = sandbox.create_signed_preview_url(
        port=BACKEND_PORT,
        expires_in_seconds=PREVIEW_TTL_SECONDS,
    )

    print("\n=== Daytona Sandbox Ready ===")
    print(f"Sandbox ID : {sandbox.id}")
    print(f"Preview URL: {preview.url}")
    print(f"Health endpoint: {preview.url}/api/health")
    print(f"\nSet this in your frontend:")
    print(f"  VITE_API_BASE={preview.url}")
    print(f"\nURL expires in {PREVIEW_TTL_SECONDS // 60} minutes.")


if __name__ == "__main__":
    main()
