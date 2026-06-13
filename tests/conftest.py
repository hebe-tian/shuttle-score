import sys
import os
import pytest
from app import create_app

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    return app


@pytest.fixture
def app_context(app):
    with app.app_context():
        yield app
