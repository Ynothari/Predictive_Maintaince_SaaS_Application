"""
Unit tests for validate_file_type and validate_csv_structure.
"""

import numpy as np
import pandas as pd
import pytest

from app.services.validation_service import validate_csv_structure, validate_file_type

REQUIRED_COLUMNS = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
]


def make_valid_df(n_rows: int = 3) -> pd.DataFrame:
    return pd.DataFrame(
        {col: np.random.uniform(0, 1000, n_rows) for col in REQUIRED_COLUMNS}
    )


class TestValidateFileType:
    def test_csv_lowercase_passes(self):
        validate_file_type("data.csv")  # should not raise

    def test_csv_uppercase_passes(self):
        validate_file_type("data.CSV")  # case-insensitive

    def test_xlsx_raises(self):
        with pytest.raises(ValueError):
            validate_file_type("data.xlsx")

    def test_txt_raises(self):
        with pytest.raises(ValueError):
            validate_file_type("data.txt")


class TestValidateCsvStructure:
    def test_valid_df_passes(self):
        validate_csv_structure(make_valid_df())  # should not raise

    def test_missing_column_raises_with_column_name(self):
        import re
        df = make_valid_df()
        missing_col = REQUIRED_COLUMNS[0]
        df = df.drop(columns=[missing_col])
        with pytest.raises(ValueError, match=re.escape(missing_col)):
            validate_csv_structure(df)

    def test_non_numeric_column_raises(self):
        df = make_valid_df()
        df[REQUIRED_COLUMNS[0]] = ["not", "a", "number"]
        with pytest.raises(ValueError):
            validate_csv_structure(df)

    def test_empty_df_behavior(self):
        # The current implementation does not check for 0 rows —
        # an empty DataFrame with correct columns passes validation.
        empty_df = pd.DataFrame(columns=REQUIRED_COLUMNS)
        # Document actual behavior: no exception raised for empty rows
        validate_csv_structure(empty_df)  # passes — 0-row check not implemented
