# Design Document: Predictive Maintenance API

## Overview

This document describes the technical design for a production-ready FastAPI backend that provides batch-based failure prediction using pre-trained machine learning models. The system follows a clean, layered architecture with separation of concerns across validation, preprocessing, and ML inference services.

The API is stateless, loads models once at startup, and processes CSV uploads to generate structured predictions suitable for frontend dashboards.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FastAPI Application                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Lifespan Event Manager                    │  │
│  │         (Model Loading at Startup)                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Route Layer                           │  │
│  │  • POST /predict  • GET /health                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Service Layer                         │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ Validation  │  │Preprocessing │  │ ML Service  │  │  │
│  │  │  Service    │→ │   Service    │→ │             │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Schema Layer                          │  │
│  │         (Pydantic Models for Validation)               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

1. Client uploads CSV file to POST /predict
2. Route layer receives multipart/form-data
3. Validation_Service validates file type and CSV structure
4. Preprocessing_Service extracts and transforms features
5. ML_Service generates predictions using loaded models
6. Response is formatted using Pydantic schemas
7. JSON response returned to client

### Technology Stack

- **Framework**: FastAPI 0.104.0+
- **Server**: Uvicorn with standard extras
- **ML Libraries**: scikit-learn 1.3.0+, joblib 1.3.0+
- **Data Processing**: pandas 2.0.0+
- **Validation**: Pydantic v2.0.0+
- **Configuration**: python-dotenv 1.0.0+
- **File Upload**: python-multipart 0.0.6+

## Components and Interfaces

### 1. Application Entry Point (main.py)

**Responsibilities:**
- Initialize FastAPI application
- Configure CORS middleware
- Register route handlers
- Implement lifespan event for model loading
- Store loaded models in application state

**Key Functions:**

```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Load ML models at startup and clean up on shutdown.
    Stores models in app.state for access across requests.
    """
    # Load models using ML_Service
    # Store in app.state.failure_model and app.state.reason_model
    # Yield control to application
    # Cleanup on shutdown (if needed)
```

```python
def create_application() -> FastAPI:
    """
    Factory function to create and configure FastAPI application.
    Returns configured app with middleware and routes.
    """
    # Create FastAPI instance with lifespan
    # Add CORS middleware
    # Include routers
    # Return app
```

### 2. Configuration Module (config.py)

**Responsibilities:**
- Load environment variables
- Provide configuration settings
- Validate required configuration at import time

**Configuration Class:**

```python
class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables.
    """
    # API Configuration
    app_name: str = "Predictive Maintenance API"
    app_version: str = "1.0.0"
    
    # Model Paths
    failure_model_path: str = "app/models/failure_model.pkl"
    reason_model_path: str = "app/models/reason_model.pkl"
    
    # CORS Configuration
    cors_origins: list[str] = ["*"]
    
    # Logging Configuration
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
```

### 3. Route Layer (routes/predict.py)

**Responsibilities:**
- Define HTTP endpoints
- Handle request/response formatting
- Coordinate service layer calls
- Implement error handling

**Endpoints:**

```python
@router.post("/predict", response_model=PredictionResponse)
async def predict_failures(
    file: UploadFile,
    request: Request
) -> PredictionResponse:
    """
    Accept CSV upload and return failure predictions.
    
    Args:
        file: Uploaded CSV file
        request: FastAPI request object (for accessing app.state)
    
    Returns:
        PredictionResponse with predictions for all rows
    
    Raises:
        HTTPException: 400 for validation errors, 422 for processing errors, 500 for server errors
    """
    # Validate file using Validation_Service
    # Preprocess data using Preprocessing_Service
    # Generate predictions using ML_Service
    # Format response
```

```python
@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request) -> HealthResponse:
    """
    Health check endpoint returning service and model status.
    
    Args:
        request: FastAPI request object (for accessing app.state)
    
    Returns:
        HealthResponse with status and model loading information
    """
    # Check if models are loaded in app.state
    # Return health status
```

### 4. Validation Service (services/validation_service.py)

**Responsibilities:**
- Validate file extensions
- Validate CSV structure and required columns
- Validate data types
- Provide detailed error messages

**Key Functions:**

```python
def validate_file_type(filename: str) -> None:
    """
    Validate that uploaded file has .csv extension.
    
    Args:
        filename: Name of uploaded file
    
    Raises:
        ValueError: If file is not a CSV
    """
```

```python
def validate_csv_structure(df: pd.DataFrame) -> None:
    """
    Validate that CSV contains all required columns with correct data types.
    
    Args:
        df: Pandas DataFrame loaded from CSV
    
    Raises:
        ValueError: If required columns are missing or have invalid types
    """
```

```python
REQUIRED_COLUMNS: list[str] = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]"
]
```

### 5. Preprocessing Service (services/preprocessing_service.py)

**Responsibilities:**
- Extract feature columns from DataFrame
- Handle missing values
- Convert data to model-compatible format
- Preserve row ordering

**Key Functions:**

```python
def extract_features(df: pd.DataFrame) -> np.ndarray:
    """
    Extract the 5 required feature columns and convert to numpy array.
    
    Args:
        df: Validated pandas DataFrame
    
    Returns:
        numpy array of shape (n_samples, 5) ready for model inference
    
    Raises:
        ValueError: If data contains null values or cannot be converted
    """
```

```python
def validate_no_missing_values(df: pd.DataFrame) -> None:
    """
    Check for missing values in feature columns.
    
    Args:
        df: DataFrame to check
    
    Raises:
        ValueError: If any missing values are found
    """
```

### 6. ML Service (services/ml_service.py)

**Responsibilities:**
- Load pre-trained models from disk
- Generate failure probability predictions
- Generate failure reason predictions
- Calculate risk categories
- Generate maintenance recommendations

**Key Functions:**

```python
def load_models(
    failure_model_path: str,
    reason_model_path: str
) -> tuple[Any, Any]:
    """
    Load pre-trained models from .pkl files using joblib.
    
    Args:
        failure_model_path: Path to failure prediction model
        reason_model_path: Path to failure reason model
    
    Returns:
        Tuple of (failure_model, reason_model)
    
    Raises:
        FileNotFoundError: If model files don't exist
        Exception: If model loading fails
    """
```

```python
def predict_failures(
    features: np.ndarray,
    failure_model: Any,
    reason_model: Any
) -> list[dict[str, Any]]:
    """
    Generate predictions for all rows in feature array.
    
    Args:
        features: numpy array of shape (n_samples, 5)
        failure_model: Loaded failure prediction model
        reason_model: Loaded failure reason model
    
    Returns:
        List of prediction dictionaries, one per row
    """
```

```python
def calculate_risk_level(probability: float) -> str:
    """
    Categorize failure probability into risk levels.
    
    Args:
        probability: Failure probability between 0 and 1
    
    Returns:
        Risk level string: "High Risk", "Medium Risk", or "Low Risk"
    """
```

```python
def generate_recommendation(risk_level: str) -> str:
    """
    Generate maintenance recommendation based on risk level.
    
    Args:
        risk_level: Risk category string
    
    Returns:
        Maintenance recommendation string
    """
```

### 7. Schema Layer (schemas/response_schema.py)

**Responsibilities:**
- Define Pydantic models for request/response validation
- Ensure type safety
- Provide JSON serialization

**Pydantic Models:**

```python
class PredictionResult(BaseModel):
    """Single row prediction result."""
    row: int
    will_fail: bool
    failure_probability: float
    risk_level: str
    failure_reason: str | None
    recommendation: str
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "row": 1,
            "will_fail": True,
            "failure_probability": 0.85,
            "risk_level": "High Risk",
            "failure_reason": "Heat Dissipation Failure",
            "recommendation": "Immediate maintenance required"
        }
    })
```

```python
class PredictionResponse(BaseModel):
    """Success response for prediction endpoint."""
    status: Literal["success"]
    total_records: int
    predictions: list[PredictionResult]
```

```python
class ErrorResponse(BaseModel):
    """Error response for all error cases."""
    status: Literal["error"]
    message: str
    details: list[str] | None = None
```

```python
class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    app_name: str
    version: str
```

## Data Models

### Input Data Model

**CSV Structure:**
- Format: CSV file with header row
- Required columns (exact names, case-sensitive):
  - "Air temperature [K]" (numeric)
  - "Process temperature [K]" (numeric)
  - "Rotational speed [rpm]" (numeric)
  - "Torque [Nm]" (numeric)
  - "Tool wear [min]" (numeric)
- Constraints:
  - All values must be numeric
  - No missing values allowed
  - Minimum 1 row of data

### Feature Vector

**Shape:** (n_samples, 5)
**Type:** numpy.ndarray with dtype float64
**Column Order:**
1. Air temperature [K]
2. Process temperature [K]
3. Rotational speed [rpm]
4. Torque [Nm]
5. Tool wear [min]

### Prediction Output Model

**Per-Row Prediction:**
- row: int (1-indexed row number)
- will_fail: bool (True if probability >= 0.5)
- failure_probability: float (0.0 to 1.0)
- risk_level: str ("High Risk" | "Medium Risk" | "Low Risk")
- failure_reason: str | None (predicted reason or null)
- recommendation: str (maintenance action)

### Risk Categorization Logic

```
failure_probability >= 0.8  → "High Risk"    → "Immediate maintenance required"
failure_probability >= 0.5  → "Medium Risk"  → "Schedule maintenance within 7 days"
failure_probability < 0.5   → "Low Risk"     → "Continue normal operations"
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Model Object Persistence

*For any* sequence of prediction requests, the model objects in app.state should remain identical (same object identity), confirming models are loaded once and reused rather than reloaded.

**Validates: Requirements 1.5, 13.3**

### Property 2: File Extension Validation

*For any* uploaded file, if the filename does not end with ".csv" (case-insensitive), the validation service should reject it with a clear error message.

**Validates: Requirements 3.1**

### Property 3: Required Column Validation

*For any* CSV DataFrame, if it is missing one or more required columns ("Air temperature [K]", "Process temperature [K]", "Rotational speed [rpm]", "Torque [Nm]", "Tool wear [min]"), the validation service should reject it and report the specific missing column names.

**Validates: Requirements 3.2, 3.4**

### Property 4: Numeric Data Type Validation

*For any* CSV DataFrame with all required columns, if any feature column contains non-numeric data, the validation service should reject it and report the specific rows and columns with type errors.

**Validates: Requirements 3.6, 3.7**

### Property 5: Feature Extraction Format

*For any* valid CSV DataFrame with n rows, the preprocessing service should extract features into a numpy array of shape (n, 5) with dtype float64, containing only the 5 required feature columns in the correct order.

**Validates: Requirements 4.1, 4.5**

### Property 6: Row Order Preservation

*For any* valid CSV DataFrame, after preprocessing, the row order in the output feature array should match the row order in the input DataFrame (excluding the header row).

**Validates: Requirements 4.2**

### Property 7: Complete Prediction Generation

*For any* feature array with n rows, the ML service should generate exactly n predictions, where each prediction includes both a failure probability and a failure reason (or null).

**Validates: Requirements 5.1, 5.2, 5.5**

### Property 8: Failure Threshold Classification

*For any* prediction with a failure probability value, the will_fail boolean should be true if and only if the probability is >= 0.5.

**Validates: Requirements 5.3, 5.4**

### Property 9: Risk Level Categorization

*For any* prediction with a failure probability, the risk level should be "High Risk" if probability >= 0.8, "Medium Risk" if 0.5 <= probability < 0.8, and "Low Risk" if probability < 0.5.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 10: Recommendation Mapping

*For any* prediction with a risk level, the recommendation should be "Immediate maintenance required" for "High Risk", "Schedule maintenance within 7 days" for "Medium Risk", and "Continue normal operations" for "Low Risk".

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 11: Response Completeness

*For any* successful prediction request with n input rows, the response should have total_records equal to n and the predictions array should contain exactly n prediction results.

**Validates: Requirements 8.2, 8.3**

### Property 12: JSON Content Type

*For all* API responses (success or error), the Content-Type header should be "application/json" and the response body should be valid JSON.

**Validates: Requirements 8.7**

### Property 13: Error Logging

*For any* error that occurs during request processing (validation, preprocessing, or prediction), the error details should be logged with appropriate context including error type and message.

**Validates: Requirements 10.1, 10.4**

### Property 14: Request Logging

*For any* prediction request, the system should log request details including the uploaded filename, file size, and number of rows processed.

**Validates: Requirements 10.3**

### Property 15: Log Level Appropriateness

*For any* logged event, the log level should be INFO for normal operations (startup, successful requests), WARNING for recoverable issues, and ERROR for failures that prevent request completion.

**Validates: Requirements 10.5**

### Property 16: CORS Header Presence

*For all* API responses, when CORS is configured, the response should include appropriate CORS headers (Access-Control-Allow-Origin, etc.) matching the configured origins.

**Validates: Requirements 11.4**

### Property 17: Stateless Request Processing

*For any* pair of concurrent or sequential prediction requests, processing one request should not create side effects (file system changes, state modifications) that affect the other request's results.

**Validates: Requirements 13.1, 13.2, 13.4**

## Error Handling

### Error Categories

**1. Validation Errors (HTTP 400)**
- Invalid file type (not .csv)
- Missing required columns
- Empty CSV file
- File upload errors

**Response Format:**
```json
{
  "status": "error",
  "message": "Validation failed",
  "details": ["Missing required column: Air temperature [K]"]
}
```

**2. Processing Errors (HTTP 422)**
- Non-numeric data in feature columns
- Missing values (null/NaN) in data
- Data type conversion failures
- Invalid data ranges

**Response Format:**
```json
{
  "status": "error",
  "message": "Data processing failed",
  "details": ["Non-numeric value in row 5, column 'Torque [Nm]'"]
}
```

**3. Server Errors (HTTP 500)**
- Model loading failures
- Model prediction failures
- Unexpected exceptions
- Internal server errors

**Response Format:**
```json
{
  "status": "error",
  "message": "Internal server error",
  "details": null
}
```

### Error Handling Strategy

**Layered Error Handling:**
1. **Route Layer**: Catch all exceptions, format error responses, set HTTP status codes
2. **Service Layer**: Raise specific exceptions with detailed messages
3. **Validation Layer**: Raise ValueError for validation failures with specific details

**Logging Strategy:**
- Log all errors with full stack traces
- Include request context (filename, size, timestamp)
- Use structured logging for easy parsing
- Never expose internal errors to clients (sanitize 500 errors)

**Exception Hierarchy:**
```python
# Custom exceptions for clear error handling
class ValidationError(ValueError):
    """Raised when input validation fails"""
    pass

class PreprocessingError(ValueError):
    """Raised when data preprocessing fails"""
    pass

class ModelError(RuntimeError):
    """Raised when model operations fail"""
    pass
```

## Testing Strategy

### Dual Testing Approach

This system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests:**
- Specific examples demonstrating correct behavior
- Edge cases (empty files, single-row CSVs, boundary probabilities)
- Error conditions (missing columns, invalid types, model failures)
- Integration points (endpoint responses, middleware behavior)
- Example: Test /health endpoint returns 200 with correct schema
- Example: Test CSV with missing column returns 400 with error details

**Property-Based Tests:**
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Validation logic across many generated inputs
- Example: For any valid CSV, preprocessing preserves row count
- Example: For any probability value, risk categorization follows rules

### Property-Based Testing Configuration

**Library:** Use `hypothesis` for Python property-based testing

**Configuration:**
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `# Feature: predictive-maintenance-api, Property {number}: {property_text}`

**Example Property Test Structure:**
```python
from hypothesis import given, strategies as st
import hypothesis

@given(
    probability=st.floats(min_value=0.0, max_value=1.0)
)
@hypothesis.settings(max_examples=100)
def test_property_9_risk_categorization(probability: float):
    """
    Feature: predictive-maintenance-api
    Property 9: Risk Level Categorization
    
    For any prediction with a failure probability, the risk level 
    should be correctly categorized based on threshold rules.
    """
    risk_level = calculate_risk_level(probability)
    
    if probability >= 0.8:
        assert risk_level == "High Risk"
    elif probability >= 0.5:
        assert risk_level == "Medium Risk"
    else:
        assert risk_level == "Low Risk"
```

### Test Coverage Requirements

**Service Layer Tests:**
- Validation Service: Test all validation rules with valid/invalid inputs
- Preprocessing Service: Test feature extraction, order preservation, type conversion
- ML Service: Test risk categorization, recommendation generation, prediction formatting

**Route Layer Tests:**
- Test /predict endpoint with valid CSV files
- Test /predict endpoint with various invalid inputs
- Test /health endpoint response structure
- Test error response formatting

**Integration Tests:**
- End-to-end test: Upload CSV → Receive predictions
- Test model loading during application startup
- Test CORS headers in responses
- Test logging output for various scenarios

**Property Tests (Minimum):**
- Property 2: File extension validation
- Property 3: Required column validation
- Property 5: Feature extraction format
- Property 6: Row order preservation
- Property 8: Failure threshold classification
- Property 9: Risk level categorization
- Property 10: Recommendation mapping
- Property 11: Response completeness

### Testing Best Practices

1. **Avoid excessive unit tests** - Property tests handle input coverage
2. **Focus unit tests on**:
   - Specific examples that demonstrate correct behavior
   - Integration between components
   - Edge cases and error conditions
3. **Use property tests for**:
   - Universal rules that apply to all inputs
   - Validation logic
   - Mathematical relationships (thresholds, categorization)
4. **Mock external dependencies**:
   - Mock model objects for service layer tests
   - Use test fixtures for sample CSV data
5. **Test isolation**:
   - Each test should be independent
   - Clean up any test artifacts
   - Don't rely on test execution order

## Deployment Considerations

### Environment Variables

Required environment variables for deployment:
```
APP_NAME=Predictive Maintenance API
APP_VERSION=1.0.0
FAILURE_MODEL_PATH=app/models/failure_model.pkl
REASON_MODEL_PATH=app/models/reason_model.pkl
CORS_ORIGINS=["http://localhost:3000","https://dashboard.example.com"]
LOG_LEVEL=INFO
```

### Model Files

- Models must be present at specified paths before application startup
- Models should be versioned and tracked separately from code
- Consider model file size for container image optimization
- Validate model compatibility during deployment

### Performance Considerations

- Model loading happens once at startup (not per request)
- CSV parsing is memory-efficient using pandas chunking if needed
- Predictions are batched (all rows processed together)
- No database queries or external API calls during prediction
- Stateless design enables horizontal scaling

### Monitoring and Observability

**Key Metrics to Monitor:**
- Request latency (p50, p95, p99)
- Error rates by type (400, 422, 500)
- CSV file sizes and row counts
- Model prediction latency
- Memory usage (model size + request processing)

**Logging:**
- Structured JSON logs for easy parsing
- Include request IDs for tracing
- Log all errors with full context
- Log model loading success/failure at startup

### Security Considerations

- Validate file sizes to prevent memory exhaustion
- Limit CSV row counts to prevent DoS
- Sanitize error messages (don't expose internal paths)
- Use CORS to restrict frontend origins
- Consider rate limiting for production deployment
- Validate file content (not just extension) to prevent malicious uploads

## Future Enhancements

Potential improvements not included in initial implementation:

1. **Async Processing**: Use background tasks for large CSV files
2. **Batch Endpoints**: Support multiple file uploads in single request
3. **Model Versioning**: API versioning for model updates
4. **Caching**: Cache predictions for identical input data
5. **Metrics Endpoint**: Prometheus-compatible metrics
6. **Authentication**: API key or JWT-based authentication
7. **Rate Limiting**: Request throttling per client
8. **File Size Limits**: Configurable max file size
9. **Streaming Responses**: Stream predictions for very large files
10. **Model Metadata**: Endpoint to query model version and training date
