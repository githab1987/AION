from dataclasses import dataclass
from enum import Enum


class TokenType(Enum):
    KEYWORD = "KEYWORD"
    IDENTIFIER = "IDENTIFIER"
    STRING = "STRING"
    NUMBER = "NUMBER"
    OPERATOR = "OPERATOR"
    INDENT = "INDENT"
    DEDENT = "DEDENT"
    NEWLINE = "NEWLINE"
    EOF = "EOF"


@dataclass
class Token:
    type: TokenType
    value: str
    line: int
    column: int


class LexerError(Exception):
    pass


class Lexer:
    KEYWORDS = {
        "kehendak", "intention", "buat", "create", "lakukan", "act",
        "amati", "observe", "periksa", "verify", "makna", "meaning",
        "seek", "stop", "replan",
    }

    OPERATORS = {":", "<", ">", "=", "!", "+", "-", "*", "/"}

    def __init__(self, source: str):
        self.source = source
        self.tokens = []
        self.indent_stack = [0]

    def tokenize(self):
        lines = self.source.splitlines()

        for line_number, raw_line in enumerate(lines, start=1):
            if not raw_line.strip() or raw_line.lstrip().startswith("#"):
                continue

            indent, content_start = self._leading_whitespace(raw_line)

            if indent > self.indent_stack[-1]:
                self.indent_stack.append(indent)
                self.tokens.append(
                    Token(TokenType.INDENT, str(indent), line_number, 1)
                )

            elif indent < self.indent_stack[-1]:
                while (
                    len(self.indent_stack) > 1
                    and indent < self.indent_stack[-1]
                ):
                    self.indent_stack.pop()
                    self.tokens.append(
                        Token(
                            TokenType.DEDENT,
                            str(indent),
                            line_number,
                            content_start + 1,
                        )
                    )

                if indent != self.indent_stack[-1]:
                    raise LexerError(
                        f"Invalid indentation at line {line_number}: {indent} columns"
                    )

            self._tokenize_line(
                raw_line,
                line_number,
                content_start,
            )

            self.tokens.append(
                Token(
                    TokenType.NEWLINE,
                    "\\n",
                    line_number,
                    len(raw_line) + 1,
                )
            )

        final_line = len(lines) + 1

        while len(self.indent_stack) > 1:
            self.indent_stack.pop()
            self.tokens.append(
                Token(
                    TokenType.DEDENT,
                    "0",
                    final_line,
                    1,
                )
            )

        self.tokens.append(
            Token(
                TokenType.EOF,
                "",
                final_line,
                1,
            )
        )

        return self.tokens

    def _leading_whitespace(self, line: str):
        columns = 0
        index = 0

        while index < len(line) and line[index] in " \t":
            columns += 4 if line[index] == "\t" else 1
            index += 1

        return columns, index

    def _tokenize_line(self, line, line_number, start):
        index = start

        while index < len(line):
            char = line[index]

            if char.isspace():
                index += 1
                continue

            if char == "#":
                break

            column = index + 1

            if char == '"':
                value, index = self._read_string(
                    line,
                    index,
                    line_number,
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
                value, index = self._read_number(
                    line,
                    index,
                )

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
                value, index = self._read_identifier(
                    line,
                    index,
                )

                token_type = (
                    TokenType.KEYWORD
                    if value in self.KEYWORDS
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

            if char in self.OPERATORS:
                value = char

                if (
                    index + 1 < len(line)
                    and line[index:index + 2]
                    in {"<=", ">=", "==", "!="}
                ):
                    value = line[index:index + 2]
                    index += 2
                else:
                    index += 1

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
                f"Unexpected character '{char}' "
                f"at line {line_number}, column {column}"
            )

    def _read_string(self, line, index, line_number):
        index += 1
        chars = []

        escapes = {
            "n": "\n",
            "t": "\t",
            '"': '"',
            "\\": "\\",
        }

        while index < len(line):
            char = line[index]

            if char == '"':
                return "".join(chars), index + 1

            if char == "\\":
                if index + 1 >= len(line):
                    raise LexerError(
                        f"Unterminated escape sequence at line {line_number}"
                    )

                next_char = line[index + 1]
                chars.append(
                    escapes.get(next_char, next_char)
                )

                index += 2
                continue

            chars.append(char)
            index += 1

        raise LexerError(
            f"Unterminated string at line {line_number}"
        )

    def _read_number(self, line, index):
        start = index
        dots = 0

        while (
            index < len(line)
            and (
                line[index].isdigit()
                or line[index] == "."
            )
        ):
            if line[index] == ".":
                dots += 1

                if dots > 1:
                    raise LexerError(
                        f"Invalid number at column {index + 1}"
                    )

            index += 1

        return line[start:index], index

    def _read_identifier(self, line, index):
        start = index

        while (
            index < len(line)
            and (
                line[index].isalnum()
                or line[index] == "_"
            )
        ):
            index += 1

        return line[start:index], index
