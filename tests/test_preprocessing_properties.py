"""
Property-based tests for the preprocessing service.
Feature: project-analysis-debug
"""

import numpy as np
import pandas as pd
from hypothesis import given, settings
from hypothesis import strategies as st

from app.services.preprocessing_service import FEATURE_COLUMNS, extract_features


def make_valid_dataframe(n_rows: int) -> pd.DataFrame:
    import numpy as np
    data = {col: np.random.uniform(0, 1000, n_rows) for col in FEATURE_COLUMNS}
    return pd.DataFrame(data)


# Feature: project-analysis-debug, Property 9: Preprocessor output shape and dtype
@given(st.integers(min_value=1, max_value=100))
@settings(max_examples=50)
def test_preprocessor_output_shape_and_dtype(n_rows):
    df = make_valid_dataframe(n_rows)
    result = extract_features(df)
    assert result.shape == (n_rows, 5)
    assert result.dtype == np.float64


# Feature: project-analysis-debug, Property 10: Row order is preserved in preprocessing
@given(st.integers(min_value=1, max_value=100))
@settings(max_examples=50)
def test_row_order_preserved(n_rows):
    df = make_valid_dataframe(n_rows)
    output = extract_features(df)
    for i in range(n_rows):
        expected = df.iloc[i][FEATURE_COLUMNS].to_numpy(dtype=np.float64)
        np.testing.assert_array_equal(output[i], expected)
