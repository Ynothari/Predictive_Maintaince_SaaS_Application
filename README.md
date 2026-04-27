# Predictive Maintenance API

A production-ready FastAPI backend that provides batch-based failure prediction for predictive maintenance systems. The API loads pre-trained machine learning models at startup and processes CSV uploads to generate structured predictions for equipment maintenance planning.

## Features

- **Batch Prediction**: Upload CSV files with sensor readings and receive failure predictions for all equipment records
- **Pre-trained Models**: ML models loaded once at startup for fast, efficient predictions
- **Risk Categorization**: Automatic classification into High, Medium, and Low risk levels
- **Maintenance Recommendations**: Actionable recommendations based on failure probability
- **Comprehensive Validation**: Multi-layer validation for file type, CSV structure, and data types
- **Type-Safe**: Full Python type hints and Pydantic v2 validation
- **Production-Ready**: Structured logging, error handling, CORS support, and health checks
- **Stateless Design**: Horizontally scalable with no session state or database dependencies

## Technology Stack

- **FastAPI 0.104.1** - Modern, high-performance web framework
- **Uvicorn** - ASGI server with standard extras
- **scikit-learn 1.3.2** - Machine learning model inference
- **pandas 2.1.3** - CSV processing and data manipulation
- **Pydantic v2** - Request/response validation and serialization
- **Python 3.10+** - Type hints and modern Python features

## Installation

### Prerequisites

- Python 3.10 or higher
- pip (Python package manager)
- Pre-trained model files (`.pkl` format)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd predictive-maintenance-api
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   # Copy the template
   cp .env.template .env
   
   # Edit .env with your configuration
   # See Configuration section below
   ```

5. **Add model files**
   
   Place your pre-trained model files in the `app/models/` directory:
   - `failure_model.pkl` - Binary classification model for failure prediction
   - `reason_model.pkl` - Multi-class classification model for failure reason

## Configuration

The API uses environment variables for configuration. Copy `.env.template` to `.env` and adjust values:

```bash
# API Configuration
APP_NAME=Predictive Maintenance API
APP_VERSION=1.0.0

# Model Paths (relative to project root)
FAILURE_MODEL_PATH=app/models/failure_model.pkl
REASON_MODEL_PATH=app/models/reason_model.pkl

# CORS Configuration (JSON array of allowed origins)
CORS_ORIGINS=["http://localhost:3000","http://localhost:8000"]

# Logging Configuration
LOG_LEVEL=INFO
```

### Configuration Options

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `APP_NAME` | Application name | Predictive Maintenance API | Any string |
| `APP_VERSION` | API version | 1.0.0 | Semantic version |
| `FAILURE_MODEL_PATH` | Path to failure model | app/models/failure_model.pkl | Relative path |
| `REASON_MODEL_PATH` | Path to reason model | app/models/reason_model.pkl | Relative path |
| `CORS_ORIGINS` | Allowed CORS origins | ["*"] | JSON array of URLs |
| `LOG_LEVEL` | Logging verbosity | INFO | DEBUG, INFO, WARNING, ERROR |

## Running the API

### Development Mode

Start the server with auto-reload enabled:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Production Mode

For production deployment, run without reload and with multiple workers:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker Deployment

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t predictive-maintenance-api .
docker run -p 8000:8000 --env-file .env predictive-maintenance-api
```

## API Documentation

### Interactive Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Endpoints

#### Health Check

**GET** `/health`

Check API status and model loading state.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "app_name": "Predictive Maintenance API",
  "version": "1.0.0"
}
```

#### Predict Failures

**POST** `/predict`

Upload a CSV file and receive failure predictions for all equipment records.

**Request:**
- Content-Type: `multipart/form-data`
- Body: CSV file with required columns

**Required CSV Columns:**
- `Air temperature [K]` (numeric)
- `Process temperature [K]` (numeric)
- `Rotational speed [rpm]` (numeric)
- `Torque [Nm]` (numeric)
- `Tool wear [min]` (numeric)

**Example CSV:**
```csv
Air temperature [K],Process temperature [K],Rotational speed [rpm],Torque [Nm],Tool wear [min]
298.1,308.6,1551,42.8,0
298.2,308.7,1408,46.3,3
298.1,308.5,1498,49.4,5
```

**Success Response (200):**
```json
{
  "status": "success",
  "total_records": 3,
  "predictions": [
    {
      "row": 1,
      "will_fail": false,
      "failure_probability": 0.12,
      "risk_level": "Low Risk",
      "failure_reason": null,
      "recommendation": "Continue normal operations"
    },
    {
      "row": 2,
      "will_fail": true,
      "failure_probability": 0.67,
      "risk_level": "Medium Risk",
      "failure_reason": "Heat Dissipation Failure",
      "recommendation": "Schedule maintenance within 7 days"
    },
    {
      "row": 3,
      "will_fail": true,
      "failure_probability": 0.89,
      "risk_level": "High Risk",
      "failure_reason": "Overstrain Failure",
      "recommendation": "Immediate maintenance required"
    }
  ]
}
```

**Error Responses:**

*Validation Error (400):*
```json
{
  "status": "error",
  "message": "Validation failed",
  "details": ["Missing required column: Air temperature [K]"]
}
```

*Processing Error (422):*
```json
{
  "status": "error",
  "message": "Data processing failed",
  "details": ["Non-numeric value in row 5, column 'Torque [Nm]'"]
}
```

*Server Error (500):*
```json
{
  "status": "error",
  "message": "Internal server error",
  "details": null
}
```

### Risk Levels

The API categorizes equipment into three risk levels based on failure probability:

| Risk Level | Probability Range | Recommendation |
|------------|-------------------|----------------|
| **High Risk** | ≥ 0.8 | Immediate maintenance required |
| **Medium Risk** | 0.5 - 0.79 | Schedule maintenance within 7 days |
| **Low Risk** | < 0.5 | Continue normal operations |

### Example Usage

#### Using cURL

```bash
curl -X POST "http://localhost:8000/predict" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sensor_data.csv"
```

#### Using Python requests

```python
import requests

url = "http://localhost:8000/predict"
files = {"file": open("sensor_data.csv", "rb")}

response = requests.post(url, files=files)
predictions = response.json()

print(f"Total records: {predictions['total_records']}")
for pred in predictions['predictions']:
    print(f"Row {pred['row']}: {pred['risk_level']} - {pred['recommendation']}")
```

#### Using JavaScript fetch

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('http://localhost:8000/predict', {
  method: 'POST',
  body: formData
})
  .then(response => response.json())
  .then(data => {
    console.log(`Total records: ${data.total_records}`);
    data.predictions.forEach(pred => {
      console.log(`Row ${pred.row}: ${pred.risk_level}`);
    });
  });
```

## Testing

The project includes comprehensive unit tests and property-based tests.

### Running Tests

**Run all tests:**
```bash
pytest
```

**Run with coverage:**
```bash
pytest --cov=app --cov-report=html
```

**Run specific test file:**
```bash
pytest test_main.py
pytest test_integration.py
```

**Run property-based tests:**
```bash
pytest app/services/test_validation_service.py -v
```

### Test Structure

- `test_main.py` - Unit tests for main application and routes
- `test_integration.py` - End-to-end integration tests
- `app/services/test_*.py` - Service layer unit and property tests

### Property-Based Testing

The project uses Hypothesis for property-based testing to verify universal properties across many generated inputs:

- File extension validation
- Required column validation
- Numeric data type validation
- Feature extraction format
- Risk categorization logic
- Recommendation mapping

## Project Structure

```
predictive-maintenance-api/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Application entry point
│   ├── config.py               # Configuration management
│   ├── models/                 # ML model files (.pkl)
│   │   ├── failure_model.pkl
│   │   └── reason_model.pkl
│   ├── routes/                 # API endpoints
│   │   └── predict.py
│   ├── schemas/                # Pydantic models
│   │   └── response_schema.py
│   └── services/               # Business logic
│       ├── ml_service.py
│       ├── preprocessing_service.py
│       └── validation_service.py
├── .env.template               # Environment variable template
├── .env                        # Local configuration (not in git)
├── requirements.txt            # Python dependencies
├── test_main.py               # Main application tests
├── test_integration.py        # Integration tests
└── README.md                  # This file
```

## Deployment Considerations

### Performance

- **Model Loading**: Models are loaded once at startup, not per request
- **Memory Usage**: Typical memory footprint is 200-500MB depending on model size
- **Request Latency**: Average response time is 50-200ms for typical CSV files (100-1000 rows)
- **Throughput**: Can handle 100+ requests/second with proper scaling

### Scaling

The API is stateless and can be scaled horizontally:

1. **Load Balancer**: Use nginx or cloud load balancer to distribute traffic
2. **Multiple Workers**: Run multiple uvicorn workers per instance
3. **Container Orchestration**: Deploy with Kubernetes or Docker Swarm
4. **Auto-scaling**: Scale based on CPU/memory usage or request queue depth

### Security

- **File Size Limits**: Configure max upload size in your reverse proxy
- **CORS**: Restrict `CORS_ORIGINS` to specific domains in production
- **Rate Limiting**: Implement rate limiting at the load balancer level
- **Input Validation**: All inputs are validated before processing
- **Error Sanitization**: Internal errors are not exposed to clients

### Monitoring

**Key Metrics to Monitor:**
- Request latency (p50, p95, p99)
- Error rates by status code (400, 422, 500)
- CSV file sizes and row counts
- Memory usage and model loading time
- Request throughput (requests/second)

**Logging:**
- All requests are logged with file metadata
- Errors include full context for debugging
- Structured JSON logging recommended for production
- Log aggregation with ELK stack or similar

### Environment-Specific Configuration

**Development:**
```bash
LOG_LEVEL=DEBUG
CORS_ORIGINS=["*"]
```

**Staging:**
```bash
LOG_LEVEL=INFO
CORS_ORIGINS=["https://staging.example.com"]
```

**Production:**
```bash
LOG_LEVEL=WARNING
CORS_ORIGINS=["https://dashboard.example.com"]
```

## Troubleshooting

### Model Loading Fails

**Error:** `Failed to start application: [Errno 2] No such file or directory`

**Solution:** Ensure model files exist at the configured paths:
```bash
ls -la app/models/
# Should show failure_model.pkl and reason_model.pkl
```

### CSV Validation Errors

**Error:** `Missing required column: Air temperature [K]`

**Solution:** Verify CSV has exact column names (case-sensitive, including units):
```csv
Air temperature [K],Process temperature [K],Rotational speed [rpm],Torque [Nm],Tool wear [min]
```

### CORS Errors in Browser

**Error:** `Access to fetch at 'http://localhost:8000' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution:** Add your frontend origin to `CORS_ORIGINS` in `.env`:
```bash
CORS_ORIGINS=["http://localhost:3000"]
```

### Import Errors

**Error:** `ModuleNotFoundError: No module named 'fastapi'`

**Solution:** Ensure virtual environment is activated and dependencies are installed:
```bash
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run tests (`pytest`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Contact the development team
- Check the API documentation at `/docs`

## Acknowledgments

- Built with FastAPI framework
- ML models trained using scikit-learn
- Property-based testing with Hypothesis
