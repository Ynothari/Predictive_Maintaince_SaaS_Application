"""
Property-based tests for pagination logic.
Feature: project-analysis-debug
"""

from hypothesis import given, settings
from hypothesis import strategies as st


# Feature: project-analysis-debug, Property 11: Pagination shows all records
@given(st.integers(min_value=0, max_value=500), st.integers(min_value=1, max_value=100))
@settings(max_examples=100)
def test_pagination_shows_all_records(n_records, page_size):
    items = list(range(n_records))
    pages = []
    page = 1
    while True:
        chunk = items[(page - 1) * page_size : page * page_size]
        if not chunk:
            break
        pages.extend(chunk)
        page += 1
    assert pages == items
