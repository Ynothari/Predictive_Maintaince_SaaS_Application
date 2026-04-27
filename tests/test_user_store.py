"""
Unit tests for app/services/user_store.py
Requirements: 3.6, 3.8, 3.9
"""
import json
import pytest
import app.services.user_store as user_store


@pytest.fixture(autouse=True)
def redirect_data_file(tmp_path, monkeypatch):
    """Redirect DATA_DIR and DATA_FILE to a temp directory for each test."""
    data_dir = str(tmp_path / "data")
    data_file = str(tmp_path / "data" / "users.json")
    monkeypatch.setattr(user_store, "DATA_DIR", data_dir)
    monkeypatch.setattr(user_store, "DATA_FILE", data_file)
    return data_file


def test_init_user_store_creates_dir_and_file(tmp_path):
    """init_user_store() creates data/ and data/users.json when missing."""
    user_store.init_user_store()
    assert (tmp_path / "data").is_dir()
    assert (tmp_path / "data" / "users.json").is_file()
    contents = json.loads((tmp_path / "data" / "users.json").read_text())
    assert contents == []


def test_append_and_find_by_username():
    """append_user + find_user_by_username round-trip."""
    user_store.init_user_store()
    record = {
        "username": "alice",
        "email": "alice@example.com",
        "full_name": "Alice Smith",
        "hashed_password": "hashed123",
    }
    user_store.append_user(record)
    found = user_store.find_user_by_username("alice")
    assert found is not None
    assert found["username"] == "alice"
    assert found["email"] == "alice@example.com"


def test_append_and_find_by_email():
    """append_user + find_user_by_email round-trip."""
    user_store.init_user_store()
    record = {
        "username": "bob",
        "email": "bob@example.com",
        "full_name": "Bob Jones",
        "hashed_password": "hashed456",
    }
    user_store.append_user(record)
    found = user_store.find_user_by_email("bob@example.com")
    assert found is not None
    assert found["username"] == "bob"
    assert found["email"] == "bob@example.com"


def test_find_user_by_username_returns_none_for_unknown():
    """find_user_by_username returns None for an unknown username."""
    user_store.init_user_store()
    result = user_store.find_user_by_username("nonexistent")
    assert result is None


def test_load_users_raises_on_corrupted_json(tmp_path):
    """load_users raises ValueError on corrupted JSON."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    data_file = data_dir / "users.json"
    data_file.write_text("{ this is not valid json }")
    with pytest.raises(ValueError, match="corrupted"):
        user_store.load_users()
