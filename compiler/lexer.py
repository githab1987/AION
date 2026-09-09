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

    OPERATORS = {
        ":",
        "<",
        ">",
        "=",
        "!",
        "+",
        "-",
        "*",
        "/",
    }

    def __init__(self, source: str):
        self.source = source
        self.tokens = []

        # Stack tingkat indentasi.
        # Level terluar selalu 0.
        self.indent_stack = [0]

    def tokenize(self):
        lines = self.source.splitlines()

        for line_number, raw_line in enumerate(lines, start=1):
            # Baris kosong tidak mengubah indentation.
            if not raw_line.strip():
                continue

            # Komentar penuh.
            if raw_line.lstrip().startswith("#"):
                continue

            indent = self._count_indent(raw_line)

            # Indentasi bertambah.
            if indent > self.indent_stack[-1]:
                self.indent_stack.append(indent)

                self.tokens.append(
                    Token(
                        TokenType.INDENT,
                        str(indent),
                        line_number,
                        1,
                    )
                )

            # Indentasi berkurang.
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
                            1,
                        )
                    )

                # Indentasi harus kembali ke level yang pernah ada.
                if indent != self.indent_stack[-1]:
                    raise LexerError(
                        f"Invalid indentation at line {line_number}: "
                        f"{indent} spaces"
                    )

            self._tokenize_line(
                raw_line,
                line_number,
                indent,
            )

            self.tokens.append(
                Token(
                    TokenType.NEWLINE,
                    "\\n",
                    line_number,
                    len(raw_line) + 1,
                )
            )

        # Tutup semua blok yang masih terbuka.
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

    def _count_indent(self, line: str) -> int:
        spaces = 0

        for char in line:
            if char == " ":
                spaces += 1
            elif char == "\t":
                # Untuk kestabilan bahasa, satu TAB dianggap 4 spasi.
                spaces += 4
            else:
                break

        return spaces

    def _tokenize_line(
        self,
        line: str,
        line_number: int,
        indent: int,
    ):
        index = indent
        length = len(line)

        while index < length:
            char = line[index]

            # Spasi.
            if char.isspace():
                index += 1
                continue

            # Komentar.
            if char == "#":
                break

            column = index + 1

            # String.
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

            # Angka.
            if char.isdigit():
                value, index = self._read_number(line, index)

                self.tokens.append(
                    Token(
                        TokenType.NUMBER,
                        value,
                        line_number,
                        column,
                    )
                )

                continue

            # Identifier / keyword.
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

            # Operator.
            if char in self.OPERATORS:
                value = char

                # Operator dua karakter.
                if (
                    index + 1 < length
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

        while index < len(line):
            char = line[index]

            if char == '"':
                return "".join(chars), index + 1

            if char == "\\":
                if index + 1 >= len(line):
                    raise LexerError(
                        f"Unterminated escape sequence "
                        f"at line {line_number}"
                    )

                next_char = line[index + 1]

                escapes = {
                    "n": "\n",
                    "t": "\t",
                    '"': '"',
                    "\\": "\\",
                }

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

        while index < len(line):
            char = line[index]

            if not char.isdigit() and char != ".":
                break

            index += 1

        return line[start:index], index

    def _read_identifier(self, line, index):
        start = index

        while index < len(line):
            char = line[index]

            if not (
                char.isalnum()
                or char == "_"
            ):
                break

            index += 1

        return line[start:index], index
