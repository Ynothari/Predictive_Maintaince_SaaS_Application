"""
Unit tests for extract_features.
"""

import numpy as np
import pandas as pd
import pytest

from app.services.preprocessing_service import FEATURE_COLUMNS, extract_features


def make_valid_df(n_rows: int = 3) -> pd.DataFrame:
    return pd.DataFrame(
        {col: np.random.uniform(0, 1000, n_rows) for col in FEATURE_COLUMNS}
    )


class TestExtractFeatures:
    def test_valid_df_returns_correct_shape_and_dtype(self):
        df = make_valid_df(3)
        result = extract_features(df)
        assert result.shape == (3, 5)
        assert result.dtype == np.float64

    def test_nan_in_column_raises_value_error(self):
        df = make_valid_df(3)
        df.loc[1, FEATURE_COLUMNS[0]] = np.nan
        with pytest.raises(ValueError):
            extract_features(df)

    def test_missing_required_column_raises_value_error(self):
        df = make_valid_df(3)
        df = df.drop(columns=[FEATURE_COLUMNS[2]])
        with pytest.raises(ValueError):
            extract_features(df)

    def test_column_order_matches_feature_columns(self):
        # Build df with columns in reversed order to ensure output order is canonical
        df = pd.DataFrame(
            {col: np.random.uniform(0, 1000, 3) for col in reversed(FEATURE_COLUMNS)}
        )
        result = extract_features(df)
        # Each column in output should match the FEATURE_COLUMNS order
        for i, col in enumerate(FEATURE_COLUMNS):
            np.testing.assert_array_almost_equal(result[:, i], df[col].to_numpy())
