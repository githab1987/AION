"""AION Lexer v0.1"""

from dataclasses import dataclass
from enum import Enum
from typing import List


class TokenType(str, Enum):
    KEYWORD = "KEYWORD"
    IDENTIFIER = "IDENTIFIER"
    STRING = "STRING"
    NUMBER = "NUMBER"
    OPERATOR = "OPERATOR"
    INDENT = "INDENT"
    DEDENT = "DEDENT"
    NEWLINE = "NEWLINE"
    EOF = "EOF"


@dataclass(frozen=True)
class Token:
    type: TokenType
    value: str
    line: int
    column: int


KEYWORDS = {
    "kehendak",
    "intention",
    "buat",
    "create",
    "lakukan",
    "act",
    "amati",
    "observe",
    "periksa",
    "verify",
    "makna",
    "meaning",
    "seek",
    "stop",
    "replan",
}


class LexerError(Exception):
    pass


class Lexer:
    def __init__(self, source: str):
        self.source = source
        self.tokens: List[Token] = []

    def tokenize(self) -> List[Token]:
        lines = self.source.splitlines()

        for line_number, line in enumerate(lines, start=1):
            self._tokenize_line(line, line_number)

        self.tokens.append(
            Token(TokenType.EOF, "", len(lines) + 1, 1)
        )

        return self.tokens

    def _tokenize_line(self, line: str, line_number: int) -> None:
        if not line.strip():
            self.tokens.append(
                Token(TokenType.NEWLINE, "", line_number, 1)
            )
            return

        stripped = line.lstrip()
        indent = len(line) - len(stripped)

        if indent:
            self.tokens.append(
                Token(TokenType.INDENT, str(indent), line_number, 1)
            )

        i = 0

        while i < len(stripped):
            char = stripped[i]
            column = i + indent + 1

            if char.isspace():
                i += 1
                continue

            if char == "#":
                break

            if char == '"':
                value, i = self._read_string(
                    stripped, i, line_number
                )

                self.tokens.append(
                    Token(
                        TokenType.STRING,
                        value,
                        line_number,
                        column,
                    )
                )
                continue

            if char.isdigit():
                value, i = self._read_number(stripped, i)

                self.tokens.append(
                    Token(
                        TokenType.NUMBER,
                        value,
                        line_number,
                        column,
                    )
                )
                continue

            if char.isalpha() or char == "_":
                value, i = self._read_identifier(stripped, i)

                token_type = (
                    TokenType.KEYWORD
                    if value in KEYWORDS
                    else TokenType.IDENTIFIER
                )

                self.tokens.append(
                    Token(
                        token_type,
                        value,
                        line_number,
                        column,
                    )
                )
                continue

            if char in "<>=!+-*/:":
                value, i = self._read_operator(stripped, i)

                self.tokens.append(
                    Token(
                        TokenType.OPERATOR,
                        value,
                        line_number,
                        column,
                    )
                )
                continue

            raise LexerError(
                f"Unexpected character {char!r} "
                f"at line {line_number}, column {column}"
            )

        self.tokens.append(
            Token(TokenType.NEWLINE, "", line_number, len(line) + 1)
        )

    @staticmethod
    def _read_string(
        text: str,
        start: int,
        line: int,
    ):
        i = start + 1
        value = []

        while i < len(text):
            if text[i] == '"':
                return "".join(value), i + 1

            if text[i] == "\\" and i + 1 < len(text):
                value.append(text[i + 1])
                i += 2
                continue

            value.append(text[i])
            i += 1

        raise LexerError(
            f"Unterminated string at line {line}"
        )

    @staticmethod
    def _read_number(text: str, start: int):
        i = start

        while i < len(text) and (
            text[i].isdigit() or text[i] == "."
        ):
            i += 1

        return text[start:i], i

    @staticmethod
    def _read_identifier(text: str, start: int):
        i = start

        while i < len(text) and (
            text[i].isalnum() or text[i] == "_"
        ):
            i += 1

        return text[start:i], i

    @staticmethod
    def _read_operator(text: str, start: int):
        two = text[start:start + 2]

        if two in {"<=", ">=", "==", "!="}:
            return two, start + 2

        return text[start], start + 1
