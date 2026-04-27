"""
Unit tests for calculate_risk_level and generate_recommendation.
"""

import pytest
from app.services.ml_service import calculate_risk_level, generate_recommendation


class TestCalculateRiskLevel:
    def test_high_risk_at_0_8(self):
        assert calculate_risk_level(0.8) == "High Risk"

    def test_medium_risk_at_0_79(self):
        assert calculate_risk_level(0.79) == "Medium Risk"

    def test_medium_risk_at_0_5(self):
        assert calculate_risk_level(0.5) == "Medium Risk"

    def test_low_risk_at_0_4999(self):
        assert calculate_risk_level(0.4999) == "Low Risk"

    def test_low_risk_at_0(self):
        assert calculate_risk_level(0.0) == "Low Risk"

    def test_high_risk_at_1(self):
        assert calculate_risk_level(1.0) == "High Risk"


class TestGenerateRecommendation:
    def test_high_risk_recommendation(self):
        assert generate_recommendation("High Risk") == "Immediate maintenance required"

    def test_medium_risk_recommendation(self):
        assert generate_recommendation("Medium Risk") == "Schedule maintenance within 7 days"

    def test_low_risk_recommendation(self):
        assert generate_recommendation("Low Risk") == "Continue normal operations"
