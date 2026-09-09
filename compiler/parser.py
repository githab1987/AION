from dataclasses import dataclass, field
from typing import List, Optional

from compiler.lexer import Lexer, Token, TokenType


class ParserError(Exception):
    pass


@dataclass
class IntentionNode:
    goal: str
    constraints: List[str] = field(default_factory=list)


@dataclass
class ProgramNode:
    intentions: List[IntentionNode] = field(default_factory=list)


class Parser:
    def __init__(self, source: str):
        self.tokens = Lexer(source).tokenize()
        self.position = 0

    def current(self) -> Token:
        return self.tokens[self.position]

    def advance(self) -> Token:
        token = self.current()
        if self.position < len(self.tokens) - 1:
            self.position += 1
        return token

    def match(self, token_type: TokenType, value: Optional[str] = None) -> bool:
        token = self.current()

        if token.type != token_type:
            return False

        if value is not None and token.value != value:
            return False

        return True

    def expect(self, token_type: TokenType, value: Optional[str] = None) -> Token:
        if not self.match(token_type, value):
            token = self.current()
            raise ParserError(
                f"Expected {token_type.value}"
                f"{f' ({value})' if value else ''}, "
                f"got {token.type.value} ({token.value}) "
                f"at line {token.line}"
            )

        return self.advance()

    def skip_newlines(self):
        while self.match(TokenType.NEWLINE):
            self.advance()

    def parse(self) -> ProgramNode:
        program = ProgramNode()

        self.skip_newlines()

        while not self.match(TokenType.EOF):
            if self.match(TokenType.KEYWORD, "kehendak"):
                program.intentions.append(self.parse_intention())
            else:
                token = self.current()
                raise ParserError(
                    f"Unexpected token '{token.value}' "
                    f"at line {token.line}"
                )

            self.skip_newlines()

        return program

    def parse_intention(self) -> IntentionNode:
        self.expect(TokenType.KEYWORD, "kehendak")
        self.expect(TokenType.OPERATOR, ":")

        self.skip_newlines()

        # INDENT menandakan isi dari kehendak.
        if self.match(TokenType.INDENT):
            self.advance()

        goal = None
        constraints = []

        while not self.match(TokenType.EOF):
            if self.match(TokenType.DEDENT):
                self.advance()
                break

            if self.match(TokenType.NEWLINE):
                self.advance()
                continue

            if self.match(TokenType.KEYWORD, "buat"):
                self.advance()

                target = self.expect(TokenType.STRING)
                goal = target.value

                self.skip_newlines()
                continue

            if self.match(TokenType.IDENTIFIER):
                constraint = self.advance()
                constraints.append(constraint.value)

                self.skip_newlines()
                continue

            if self.match(TokenType.KEYWORD):
                keyword = self.advance()
                constraints.append(keyword.value)

                self.skip_newlines()
                continue

            token = self.current()
            raise ParserError(
                f"Unexpected token '{token.value}' "
                f"inside intention at line {token.line}"
            )

        if goal is None:
            raise ParserError(
                "Intention must contain a goal, "
                "for example: buat \"Toko Kopi Bos\""
            )

        return IntentionNode(
            goal=goal,
            constraints=constraints,
        )
