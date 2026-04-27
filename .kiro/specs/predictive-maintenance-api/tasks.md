# Implementation Plan: Predictive Maintenance API

## Overview

This implementation plan breaks down the FastAPI backend into discrete coding tasks. The approach follows a bottom-up strategy: build core services first, then routes, then wire everything together with the main application. Each task includes property-based tests to validate correctness properties from the design document.

## Tasks

- [x] 1. Set up project structure and configuration
  - Create directory structure (app/, app/routes/, app/services/, app/schemas/, app/models/)
  - Create all `__init__.py` files for Python packages
  - Implement `app/config.py` with Pydantic Settings for environment variable loading
  - Create `.env` template file with all required configuration variables
  - Create `requirements.txt` with all dependencies
  - _Requirements: 12.1, 12.2, 12.3_

- [ ] 2. Implement response schemas with Pydantic v2
  - [x] 2.1 Create `app/schemas/response_schema.py` with all Pydantic models
    - Implement `PredictionResult` model with all required fields
    - Implement `PredictionResponse` model for success responses
    - Implement `ErrorResponse` model for error responses
    - Implement `HealthResponse` model for health check endpoint
    - Add example schemas for documentation
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 9.2_

- [ ] 3. Implement validation service
  - [x] 3.1 Create `app/services/validation_service.py` with validation functions
    - Implement `validate_file_type()` to check .csv extension
    - Implement `validate_csv_structure()` to check required columns and data types
    - Define `REQUIRED_COLUMNS` constant with exact column names
    - Add comprehensive docstrings and type hints
    - _Requirements: 3.1, 3.2, 3.3, 3.6_
  
  - [ ]* 3.2 Write property test for file extension validation
    - **Property 2: File Extension Validation**
    - **Validates: Requirements 3.1**
  
  - [ ]* 3.3 Write property test for required column validation
    - **Property 3: Required Column Validation**
    - **Validates: Requirements 3.2, 3.4**
  
  - [ ]* 3.4 Write property test for numeric data type validation
    - **Property 4: Numeric Data Type Validation**
    - **Validates: Requirements 3.6, 3.7**
  
  - [ ]* 3.5 Write unit tests for validation edge cases
    - Test empty CSV files
    - Test CSV with extra columns (should pass)
    - Test case-insensitive file extension
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

- [ ] 4. Implement preprocessing service
  - [x] 4.1 Create `app/services/preprocessing_service.py` with preprocessing functions
    - Implement `extract_features()` to extract 5 feature columns as numpy array
    - Implement `validate_no_missing_values()` to check for null values
    - Add type hints for pandas DataFrame and numpy array types
    - Add comprehensive docstrings
    - _Requirements: 4.1, 4.3, 4.5_
  
  - [ ]* 4.2 Write property test for feature extraction format
    - **Property 5: Feature Extraction Format**
    - **Validates: Requirements 4.1, 4.5**
  
  - [ ]* 4.3 Write property test for row order preservation
    - **Property 6: Row Order Preservation**
    - **Validates: Requirements 4.2**
  
  - [ ]* 4.4 Write unit tests for preprocessing edge cases
    - Test single-row CSV
    - Test CSV with missing values (should reject)
    - Test CSV with extra columns (should extract only required ones)
    - _Requirements: 4.3, 4.4_

- [ ] 5. Implement ML service
  - [x] 5.1 Create `app/services/ml_service.py` with ML functions
    - Implement `load_models()` to load .pkl files using joblib
    - Implement `predict_failures()` to generate predictions for all rows
    - Implement `calculate_risk_level()` with threshold logic
    - Implement `generate_recommendation()` based on risk level
    - Add comprehensive docstrings and type hints
    - _Requirements: 1.1, 5.1, 5.2, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_
  
  - [ ]* 5.2 Write property test for complete prediction generation
    - **Property 7: Complete Prediction Generation**
    - **Validates: Requirements 5.1, 5.2, 5.5**
  
  - [ ]* 5.3 Write property test for failure threshold classification
    - **Property 8: Failure Threshold Classification**
    - **Validates: Requirements 5.3, 5.4**
  
  - [ ]* 5.4 Write property test for risk level categorization
    - **Property 9: Risk Level Categorization**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  
  - [ ]* 5.5 Write property test for recommendation mapping
    - **Property 10: Recommendation Mapping**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
  
  - [ ]* 5.6 Write unit tests for ML service edge cases
    - Test model loading with invalid paths (should raise error)
    - Test predictions with boundary probabilities (0.0, 0.5, 0.8, 1.0)
    - Test failure reason handling (null vs string)
    - _Requirements: 1.3, 5.6_

- [x] 6. Checkpoint - Ensure all service layer tests pass
  - Run all tests for validation, preprocessing, and ML services
  - Verify all property tests pass with 100+ iterations
  - Ask the user if questions arise

- [ ] 7. Implement route layer
  - [x] 7.1 Create `app/routes/predict.py` with endpoint handlers
    - Implement POST `/predict` endpoint with file upload handling
    - Implement GET `/health` endpoint with model status check
    - Add error handling with try-catch blocks for all error types
    - Format error responses with appropriate HTTP status codes (400, 422, 500)
    - Add request logging for file uploads
    - Add error logging for all failures
    - Use Pydantic response models for type safety
    - _Requirements: 2.1, 2.2, 3.4, 3.5, 3.7, 4.4, 5.6, 8.1, 8.4, 8.5, 10.1, 10.3, 10.4_
  
  - [ ]* 7.2 Write property test for response completeness
    - **Property 11: Response Completeness**
    - **Validates: Requirements 8.2, 8.3**
  
  - [ ]* 7.3 Write unit tests for endpoint behavior
    - Test /health endpoint returns 200 with correct schema
    - Test /predict with valid CSV returns 200 with predictions
    - Test /predict with missing columns returns 400 with error details
    - Test /predict with non-numeric data returns 422 with error details
    - Test /predict with non-CSV file returns 400 with error message
    - _Requirements: 2.1, 2.4, 3.4, 3.5, 3.7, 8.1_

- [ ] 8. Implement main application with lifespan events
  - [x] 8.1 Create `app/main.py` with FastAPI application setup
    - Implement `lifespan()` async context manager for model loading
    - Load models at startup and store in `app.state`
    - Implement `create_application()` factory function
    - Add CORS middleware with configurable origins
    - Include predict router
    - Add startup logging for model loading
    - Add error handling for model loading failures
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.2, 11.1, 11.2_
  
  - [ ]* 8.2 Write property test for model object persistence
    - **Property 1: Model Object Persistence**
    - **Validates: Requirements 1.5, 13.3**
  
  - [ ]* 8.3 Write property test for stateless request processing
    - **Property 17: Stateless Request Processing**
    - **Validates: Requirements 13.1, 13.2, 13.4**
  
  - [ ]* 8.4 Write unit tests for application lifecycle
    - Test application starts successfully with valid model paths
    - Test application fails to start with invalid model paths
    - Test models are accessible in app.state after startup
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 9. Checkpoint - Ensure all integration tests pass
  - Run full test suite including integration tests
  - Test end-to-end flow: upload CSV → receive predictions
  - Verify CORS headers in responses
  - Verify logging output for various scenarios
  - Ask the user if questions arise

- [ ]* 10. Write property tests for cross-cutting concerns
  - [ ]* 10.1 Write property test for JSON content type
    - **Property 12: JSON Content Type**
    - **Validates: Requirements 8.7**
  
  - [ ]* 10.2 Write property test for error logging
    - **Property 13: Error Logging**
    - **Validates: Requirements 10.1, 10.4**
  
  - [ ]* 10.3 Write property test for request logging
    - **Property 14: Request Logging**
    - **Validates: Requirements 10.3**
  
  - [ ]* 10.4 Write property test for log level appropriateness
    - **Property 15: Log Level Appropriateness**
    - **Validates: Requirements 10.5**
  
  - [ ]* 10.5 Write property test for CORS header presence
    - **Property 16: CORS Header Presence**
    - **Validates: Requirements 11.4**

- [ ] 11. Create documentation and deployment files
  - [x] 11.1 Create `README.md` with setup and usage instructions
    - Add project overview and features
    - Add installation instructions
    - Add configuration instructions
    - Add API endpoint documentation with examples
    - Add testing instructions
    - Add deployment considerations
    - _Requirements: All_
  
  - [x] 11.2 Create placeholder model files
    - Create `app/models/failure_model.pkl` placeholder comment file
    - Create `app/models/reason_model.pkl` placeholder comment file
    - Add instructions for replacing with actual trained models
    - _Requirements: 1.1_

- [x] 12. Final checkpoint - Complete system validation
  - Run complete test suite (unit + property tests)
  - Verify all 17 correctness properties pass
  - Test application startup with placeholder models
  - Verify all endpoints respond correctly
  - Check code quality (type hints, docstrings, error handling)
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Service layer is built first, then routes, then main application
- Checkpoints ensure incremental validation at key milestones
- All code should include Python 3.10+ type hints and comprehensive docstrings
- Use hypothesis library for property-based testing
- Mock model objects for service layer tests to avoid dependency on actual .pkl files
