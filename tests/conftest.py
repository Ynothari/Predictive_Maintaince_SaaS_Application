import pytest
import joblib


@pytest.fixture(scope="session")
def failure_model():
    return joblib.load("app/models/failure_model.pkl")


@pytest.fixture(scope="session")
def reason_model():
    return joblib.load("app/models/reason_model.pkl")
