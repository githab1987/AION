from compiler.lexer import Lexer, TokenType


def test_aion_intention():
    source = '''kehendak:
    buat "Toko Kopi Bos"
    sederhana
    cepat
    indah
'''

    tokens = Lexer(source).tokenize()

    values = [token.value for token in tokens]

    assert "kehendak" in values
    assert "buat" in values
    assert "Toko Kopi Bos" in values
    assert "sederhana" in values
    assert "cepat" in values
    assert "indah" in values


def test_string_token():
    source = 'buat "AION"'

    tokens = Lexer(source).tokenize()

    assert tokens[0].type == TokenType.KEYWORD
    assert tokens[1].type == TokenType.STRING
    assert tokens[1].value == "AION"

def test_indent_and_dedent():
    source = '''kehendak:
    buat "Toko Kopi Bos"
    sederhana
'''

    tokens = Lexer(source).tokenize()

    types = [token.type for token in tokens]

    assert TokenType.INDENT in types
    assert TokenType.DEDENT in types
    assert types[-1] == TokenType.EOF


def test_nested_indent():
    source = '''kehendak:
    buat "AION"
'''

    tokens = Lexer(source).tokenize()

    values = [
        (token.type, token.value)
        for token in tokens
    ]

    assert values[0][0] == TokenType.KEYWORD
    assert values[0][1] == "kehendak"

    assert any(
        token_type == TokenType.INDENT
        for token_type, _ in values
    )

    assert any(
        token_type == TokenType.DEDENT
        for token_type, _ in values
    )
