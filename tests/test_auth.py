"""
Unit tests for POST /auth/login.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_USERNAME = "admin"
VALID_PASSWORD = "admin123"


class TestLogin:
    def test_valid_credentials_returns_200(self):
        response = client.post(
            "/auth/login",
            json={"username": VALID_USERNAME, "password": VALID_PASSWORD},
        )
        assert response.status_code == 200

    def test_valid_credentials_returns_access_token(self):
        response = client.post(
            "/auth/login",
            json={"username": VALID_USERNAME, "password": VALID_PASSWORD},
        )
        data = response.json()
        assert "access_token" in data
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0

    def test_valid_credentials_returns_bearer_token_type(self):
        response = client.post(
            "/auth/login",
            json={"username": VALID_USERNAME, "password": VALID_PASSWORD},
        )
        assert response.json()["token_type"] == "bearer"

    def test_access_token_is_valid_jwt(self):
        response = client.post(
            "/auth/login",
            json={"username": VALID_USERNAME, "password": VALID_PASSWORD},
        )
        token = response.json()["access_token"]
        parts = token.split(".")
        assert len(parts) == 3, "JWT must have 3 segments separated by '.'"

    def test_invalid_password_returns_401(self):
        response = client.post(
            "/auth/login",
            json={"username": VALID_USERNAME, "password": "wrongpassword"},
        )
        assert response.status_code == 401

    def test_invalid_username_returns_401(self):
        response = client.post(
            "/auth/login",
            json={"username": "notauser", "password": VALID_PASSWORD},
        )
        assert response.status_code == 401
