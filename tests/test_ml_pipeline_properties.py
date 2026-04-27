"""
Property-based tests for the ML pipeline.
Feature: project-analysis-debug
"""

import joblib
import numpy as np
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from hypothesis.extra import numpy as npst

from app.services.ml_service import (
    calculate_risk_level,
    generate_recommendation,
    predict_failures,
)

# Load models once at module level
_failure_model = joblib.load("app/models/failure_model.pkl")
_reason_model = joblib.load("app/models/reason_model.pkl")

VALID_RISK_LEVELS = {"High Risk", "Medium Risk", "Low Risk"}
VALID_RECOMMENDATIONS = {
    "Immediate maintenance required",
    "Schedule maintenance within 7 days",
    "Continue normal operations",
}

# Strategy for generating (n, 5) feature arrays
def feature_array_strategy():
    n = st.integers(min_value=1, max_value=20)
    return n.flatmap(
        lambda rows: npst.arrays(
            dtype=np.float64,
            shape=(rows, 5),
            elements=st.floats(
                min_value=-1e4,
                max_value=1e4,
                allow_nan=False,
                allow_infinity=False,
            ),
        )
    )


# Feature: project-analysis-debug, Property 1: Output count equals input row count
@given(feature_array_strategy())
@settings(max_examples=50)
def test_output_count_equals_input_row_count(features):
    n = features.shape[0]
    results = predict_failures(features, _failure_model, _reason_model)
    assert len(results) == n


# Feature: project-analysis-debug, Property 2: All failure probabilities are in [0.0, 1.0]
@given(feature_array_strategy())
@settings(max_examples=50)
def test_failure_probabilities_in_range(features):
    results = predict_failures(features, _failure_model, _reason_model)
    for r in results:
        assert 0.0 <= r["failure_probability"] <= 1.0


# Feature: project-analysis-debug, Property 3: All risk levels are in the valid set
@given(feature_array_strategy())
@settings(max_examples=50)
def test_risk_levels_in_valid_set(features):
    results = predict_failures(features, _failure_model, _reason_model)
    for r in results:
        assert r["risk_level"] in VALID_RISK_LEVELS


# Feature: project-analysis-debug, Property 4: Risk level thresholds are correct
@given(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))
@settings(max_examples=50)
def test_risk_level_thresholds(p):
    level = calculate_risk_level(p)
    if p >= 0.8:
        assert level == "High Risk"
    elif p >= 0.5:
        assert level == "Medium Risk"
    else:
        assert level == "Low Risk"


# Feature: project-analysis-debug, Property 5: failure_reason is null iff will_fail is false
@given(feature_array_strategy())
@settings(max_examples=50)
def test_failure_reason_null_iff_will_fail_false(features):
    results = predict_failures(features, _failure_model, _reason_model)
    for r in results:
        if r["will_fail"] is False:
            assert r["failure_reason"] is None
        else:
            assert r["failure_reason"] is not None


# Feature: project-analysis-debug, Property 6: will_fail is determined by the 0.5 threshold
@given(feature_array_strategy())
@settings(max_examples=50)
def test_will_fail_determined_by_threshold(features):
    results = predict_failures(features, _failure_model, _reason_model)
    for r in results:
        assert r["will_fail"] == (r["failure_probability"] >= 0.5)


# Feature: project-analysis-debug, Property 7: Recommendation chain is correct
@given(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))
@settings(max_examples=50)
def test_recommendation_chain(p):
    rec = generate_recommendation(calculate_risk_level(p))
    assert rec in VALID_RECOMMENDATIONS


# Feature: project-analysis-debug, Property 8: Row values are sequential 1..n
@given(feature_array_strategy())
@settings(max_examples=50)
def test_row_values_sequential(features):
    n = features.shape[0]
    results = predict_failures(features, _failure_model, _reason_model)
    assert [r["row"] for r in results] == list(range(1, n + 1))
