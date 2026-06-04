import sqlite3
import pytest
from flashmd.db.database import init_db
from flashmd.parser.md_parser import parse


SAMPLE_MD = """\
# Sample Deck
---
## Basics

**1. FOO — Foo Term**
Definition of foo.

**2. BAR — Bar Term**
Definition of bar.

First line of second paragraph.

## Advanced

**3. BAZ — Baz Term**
Definition of baz.
"""


@pytest.fixture
def conn():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys = ON")
    init_db(c)
    yield c
    c.close()


@pytest.fixture
def parsed_deck():
    return parse(SAMPLE_MD, "sample.md")
