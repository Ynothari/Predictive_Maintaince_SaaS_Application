"""
Unit tests for POST /auth/register and POST /auth/change-password.

Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 3.10, 3.11, 9.9, 9.10, 9.11
"""

import json
import pytest
from passlib.context import CryptContext
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """TestClient with user store redirected to a temp directory.

    Also patches pwd_context in auth routes to use sha256_crypt, which avoids
    the bcrypt 5.x / passlib 1.7.x incompatibility present in this environment.
    """
    import app.services.user_store as user_store_module
    import app.routes.auth as auth_module

    # Redirect user store to a temp file
    tmp_data_file = str(tmp_path / "users.json")
    with open(tmp_data_file, "w") as f:
        json.dump([], f)

    monkeypatch.setattr(user_store_module, "DATA_FILE", tmp_data_file)
    monkeypatch.setattr(user_store_module, "DATA_DIR", str(tmp_path))

    # Replace bcrypt context with sha256_crypt to avoid bcrypt 5.x compat issue
    test_pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
    monkeypatch.setattr(auth_module, "pwd_context", test_pwd_context)

    from app.main import app
    return TestClient(app)


VALID_USER = {
    "full_name": "Test User",
    "email": "testuser@example.com",
    "username": "testuser",
    "password": "securepass123",
}

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


class TestRegister:
    def test_valid_registration_returns_200_with_jwt(self, client):
        """Req 3.1, 3.2 - Valid registration returns 200 and a JWT."""
        response = client.post("/auth/register", json=VALID_USER)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0
        assert data["token_type"] == "bearer"
        # Verify it's a 3-part JWT
        assert len(data["access_token"].split(".")) == 3

    def test_duplicate_username_returns_409(self, client):
        """Req 3.3 - Duplicate username returns 409."""
        client.post("/auth/register", json=VALID_USER)
        duplicate = {**VALID_USER, "email": "other@example.com"}
        response = client.post("/auth/register", json=duplicate)
        assert response.status_code == 409

    def test_duplicate_email_returns_409(self, client):
        """Req 3.3 - Duplicate email returns 409."""
        client.post("/auth/register", json=VALID_USER)
        duplicate = {**VALID_USER, "username": "otherusername"}
        response = client.post("/auth/register", json=duplicate)
        assert response.status_code == 409

    def test_password_less_than_8_chars_returns_422(self, client):
        """Req 3.4 - Password shorter than 8 characters returns 422."""
        short_pw_user = {**VALID_USER, "password": "short"}
        response = client.post("/auth/register", json=short_pw_user)
        assert response.status_code == 422

    def test_registered_user_can_login(self, client):
        """Req 3.7 - Registered user can log in via /auth/login."""
        client.post("/auth/register", json=VALID_USER)
        login_response = client.post(
            "/auth/login",
            json={"username": VALID_USER["username"], "password": VALID_USER["password"]},
        )
        assert login_response.status_code == 200
        data = login_response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_hardcoded_admin_still_works_after_user_store_active(self, client):
        """Req 9.9 - Hardcoded admin credentials still work when user store is active."""
        # Register a regular user to ensure user store is active
        client.post("/auth/register", json=VALID_USER)
        # Admin should still be able to log in
        response = client.post(
            "/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data


class TestChangePassword:
    def _register_and_get_token(self, client) -> str:
        """Helper: register a user and return the JWT."""
        response = client.post("/auth/register", json=VALID_USER)
        return response.json()["access_token"]

    def test_valid_current_password_returns_200(self, client):
        """Req 9.10 - Change password with valid current password returns 200."""
        token = self._register_and_get_token(client)
        response = client.post(
            "/auth/change-password",
            json={"current_password": VALID_USER["password"], "new_password": "newpassword99"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"

    def test_incorrect_current_password_returns_401(self, client):
        """Req 9.11 - Change password with wrong current password returns 401."""
        token = self._register_and_get_token(client)
        response = client.post(
            "/auth/change-password",
            json={"current_password": "wrongpassword!", "new_password": "newpassword99"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401

    def test_change_password_without_jwt_returns_401(self, client):
        """Req 3.10, 3.11 - Change password without JWT returns 401."""
        response = client.post(
            "/auth/change-password",
            json={"current_password": VALID_USER["password"], "new_password": "newpassword99"},
        )
        assert response.status_code == 401
