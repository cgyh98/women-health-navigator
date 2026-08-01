#!/usr/bin/env python3
"""
Provision a Daytona sandbox for Women's Health Navigator backend.

Usage:
    export DAYTONA_API_KEY=your_key_here
    python daytona/create_sandbox.py <git-repo-url>

Prints a signed preview URL for the backend port once the sandbox is healthy.
"""

import os
import sys
import time

try:
    from daytona import Daytona, CreateSandboxParams
except ImportError:
    print("ERROR: daytona SDK not installed. Run: pip install daytona")
    sys.exit(1)


BACKEND_PORT = int(os.environ.get("PORT", 8787))
PREVIEW_TTL_SECONDS = 3600  # 1 hour


def main():
    if len(sys.argv) < 2:
        print(f"Usage: python {sys.argv[0]} <git-repo-url>")
        sys.exit(1)

    repo_url = sys.argv[1]
    api_key = os.environ.get("DAYTONA_API_KEY")
    if not api_key:
        print("ERROR: DAYTONA_API_KEY environment variable not set.")
        sys.exit(1)

    client = Daytona(api_key=api_key)

    print(f"Creating Daytona sandbox for repo: {repo_url}")
    sandbox = client.create(
        CreateSandboxParams(
            language="javascript",
            git_url=repo_url,
        )
    )
    print(f"Sandbox created: {sandbox.id}")

    # Run setup script inside the sandbox
    print("Running setup.sh inside sandbox...")
    session = sandbox.process.create_session("setup")
    session.exec("bash daytona/setup.sh", timeout=300)
    print("Setup complete.")

    # Wait briefly for the server to stabilize
    time.sleep(3)

    # Generate signed preview URL
    preview_url = sandbox.create_signed_preview_url(
        port=BACKEND_PORT,
        expires_in_seconds=PREVIEW_TTL_SECONDS,
    )

    print("\n=== Daytona Sandbox Ready ===")
    print(f"Sandbox ID : {sandbox.id}")
    print(f"Preview URL: {preview_url}")
    print(f"Health endpoint: {preview_url}/api/health")
    print(f"\nSet this in your frontend:")
    print(f"  VITE_API_BASE={preview_url}")
    print(f"\nURL expires in {PREVIEW_TTL_SECONDS // 60} minutes.")


if __name__ == "__main__":
    main()
