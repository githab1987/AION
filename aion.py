#!/usr/bin/env python3
"""AION executable entry point (v0.1)."""

import sys
from pathlib import Path

from compiler.parser import Parser, ParserError


def run(source: str) -> int:
    try:
        program = Parser(source).parse()
    except (ParserError, Exception) as exc:
        print(f"AION ERROR: {exc}")
        return 1

    print("AION")
    print("====")
    print(f"Intentions: {len(program.intentions)}")

    for index, intention in enumerate(program.intentions, start=1):
        print(f"[{index}] {intention.goal}")
        if intention.constraints:
            print("    constraints: " + ", ".join(intention.constraints))
        print("    status: DECLARED")

    return 0


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python aion.py <file.aion>")
        return 2

    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"AION ERROR: file not found: {path}")
        return 2

    return run(path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    raise SystemExit(main())
