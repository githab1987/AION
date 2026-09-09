from compiler.parser import Parser


def test_parse_intention():
    source = '''kehendak:
    buat "Toko Kopi Bos"
    sederhana
    cepat
    indah
'''

    program = Parser(source).parse()

    assert len(program.intentions) == 1

    intention = program.intentions[0]

    assert intention.goal == "Toko Kopi Bos"
    assert "sederhana" in intention.constraints
    assert "cepat" in intention.constraints
    assert "indah" in intention.constraints
