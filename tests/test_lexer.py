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
