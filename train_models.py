"""
Proper Model Training Script for Predictive Maintenance

This script trains RandomForest models on the actual machine_logs.csv dataset
with proper class imbalance handling and evaluation.
"""

import argparse
import sys
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import os

print("=" * 80)
print("PREDICTIVE MAINTENANCE - MODEL TRAINING")
print("=" * 80)
print()

# Configuration — parse data path from CLI arg or DATA_PATH env var
parser = argparse.ArgumentParser(description="Train Predictive Maintenance ML models")
parser.add_argument("--data-path", default=os.environ.get("DATA_PATH"), help="Path to machine_logs.csv dataset")
args = parser.parse_args()

if not args.data_path:
    print("Error: no data path provided. Use --data-path or set the DATA_PATH environment variable.")
    sys.exit(1)

if not os.path.exists(args.data_path):
    print(f"Error: dataset file not found: {args.data_path}")
    sys.exit(1)

CSV_FILE_PATH = args.data_path
FAILURE_MODEL_PATH = "app/models/failure_model.pkl"
REASON_MODEL_PATH = "app/models/reason_model.pkl"

# Failure reason mapping
FAILURE_REASON_MAP = {
    0: "Tool Wear Failure",
    1: "Heat Dissipation Failure",
    2: "Power Failure",
    3: "Overstrain Failure",
    4: "Random Failure"
}

print("Step 1: Loading dataset...")
print("-" * 80)

# Load dataset
df = pd.read_csv(CSV_FILE_PATH)
print(f"✓ Dataset loaded: {len(df)} rows, {len(df.columns)} columns")
print()

# Define feature columns (exactly as required by API)
FEATURE_COLUMNS = [
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]"
]

# Extract features
X = df[FEATURE_COLUMNS].values
print(f"✓ Features extracted: {X.shape}")
print(f"  Columns: {', '.join(FEATURE_COLUMNS)}")
print()

# Extract target (Machine failure)
y_failure = df["Machine failure"].values
print(f"✓ Target extracted: Machine failure")
print(f"  Class distribution:")
print(f"    No Failure (0): {(y_failure == 0).sum()} ({(y_failure == 0).sum() / len(y_failure) * 100:.1f}%)")
print(f"    Failure (1): {(y_failure == 1).sum()} ({(y_failure == 1).sum() / len(y_failure) * 100:.1f}%)")
print(f"  ⚠ Class imbalance detected: {(y_failure == 0).sum() / (y_failure == 1).sum():.1f}:1 ratio")
print()

# Extract failure reasons (for reason model)
# Combine all failure type columns into a single reason
failure_types = []
for idx, row in df.iterrows():
    if row["TWF"] == 1:
        failure_types.append(0)  # Tool Wear Failure
    elif row["HDF"] == 1:
        failure_types.append(1)  # Heat Dissipation Failure
    elif row["PWF"] == 1:
        failure_types.append(2)  # Power Failure
    elif row["OSF"] == 1:
        failure_types.append(3)  # Overstrain Failure
    elif row["RNF"] == 1:
        failure_types.append(4)  # Random Failure
    else:
        failure_types.append(-1)  # No failure

y_reason = np.array(failure_types)
print(f"✓ Failure reasons extracted")
print(f"  Reason distribution:")
for reason_id, reason_name in FAILURE_REASON_MAP.items():
    count = (y_reason == reason_id).sum()
    print(f"    {reason_name}: {count} ({count / len(y_reason) * 100:.1f}%)")
print(f"    No Failure: {(y_reason == -1).sum()} ({(y_reason == -1).sum() / len(y_reason) * 100:.1f}%)")
print()

print("=" * 80)
print("Step 2: Training Failure Prediction Model")
print("=" * 80)
print()

# Split data with stratification to maintain class balance
X_train, X_test, y_train, y_test = train_test_split(
    X, y_failure, 
    test_size=0.2, 
    random_state=42, 
    stratify=y_failure
)

print(f"✓ Data split:")
print(f"  Training set: {len(X_train)} samples")
print(f"  Test set: {len(X_test)} samples")
print(f"  Train class distribution: {(y_train == 1).sum()} failures, {(y_train == 0).sum()} no failures")
print(f"  Test class distribution: {(y_test == 1).sum()} failures, {(y_test == 0).sum()} no failures")
print()

# Train failure model with proper class imbalance handling
print("Training RandomForestClassifier with balanced class weights...")
failure_model = RandomForestClassifier(
    n_estimators=300,
    max_depth=15,
    min_samples_split=10,
    min_samples_leaf=4,
    class_weight="balanced_subsample",
    random_state=42,
    n_jobs=-1,
    verbose=0
)

failure_model.fit(X_train, y_train)
print("✓ Model training complete")
print()

# Evaluate on test set
print("Evaluating on test set...")
y_pred = failure_model.predict(X_test)
y_pred_proba = failure_model.predict_proba(X_test)[:, 1]

accuracy = accuracy_score(y_test, y_pred)
print(f"✓ Accuracy: {accuracy * 100:.2f}%")
print()

print("Classification Report:")
print("-" * 80)
print(classification_report(y_test, y_pred, target_names=["No Failure", "Failure"]))

print("Confusion Matrix:")
print("-" * 80)
cm = confusion_matrix(y_test, y_pred)
print(f"                 Predicted No Failure  Predicted Failure")
print(f"Actual No Failure        {cm[0][0]:6d}              {cm[0][1]:6d}")
print(f"Actual Failure           {cm[1][0]:6d}              {cm[1][1]:6d}")
print()

# Calculate metrics
tn, fp, fn, tp = cm.ravel()
precision = tp / (tp + fp) if (tp + fp) > 0 else 0
recall = tp / (tp + fn) if (tp + fn) > 0 else 0
f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0

print(f"Detailed Metrics:")
print(f"  True Positives: {tp}")
print(f"  False Positives: {fp}")
print(f"  True Negatives: {tn}")
print(f"  False Negatives: {fn}")
print(f"  Precision: {precision * 100:.2f}%")
print(f"  Recall: {recall * 100:.2f}%")
print(f"  F1 Score: {f1 * 100:.2f}%")
print()

# Feature importance
print("Feature Importance:")
print("-" * 80)
feature_importance = failure_model.feature_importances_
for feature, importance in sorted(zip(FEATURE_COLUMNS, feature_importance), key=lambda x: x[1], reverse=True):
    print(f"  {feature}: {importance:.4f}")
print()

# Validation checks
print("Validation Checks:")
print("-" * 80)
if accuracy > 0.90:
    print(f"  ✓ Accuracy > 90%: {accuracy * 100:.2f}%")
else:
    print(f"  ⚠ Accuracy < 90%: {accuracy * 100:.2f}% (may need tuning)")

if precision > 0.20:
    print(f"  ✓ Precision reasonable: {precision * 100:.2f}%")
else:
    print(f"  ⚠ Precision very low: {precision * 100:.2f}%")

if recall < 0.99:
    print(f"  ✓ Recall not artificially 100%: {recall * 100:.2f}%")
else:
    print(f"  ⚠ Recall suspiciously high: {recall * 100:.2f}%")

pred_failure_rate = (y_pred == 1).sum() / len(y_pred)
if pred_failure_rate < 0.90:
    print(f"  ✓ Not predicting 100% failures: {pred_failure_rate * 100:.1f}% predicted as failures")
else:
    print(f"  ⚠ Predicting too many failures: {pred_failure_rate * 100:.1f}%")
print()

# Save failure model
print(f"Saving failure model to {FAILURE_MODEL_PATH}...")
os.makedirs(os.path.dirname(FAILURE_MODEL_PATH), exist_ok=True)
joblib.dump(failure_model, FAILURE_MODEL_PATH)
print("✓ Failure model saved")
print()

print("=" * 80)
print("Step 3: Training Failure Reason Model")
print("=" * 80)
print()

# Filter to only failure cases for reason prediction
failure_mask = y_failure == 1
X_failures = X[failure_mask]
y_reasons_failures = y_reason[failure_mask]

print(f"✓ Filtered to failure cases only: {len(X_failures)} samples")
print()

# Split data for reason model
X_train_reason, X_test_reason, y_train_reason, y_test_reason = train_test_split(
    X_failures, y_reasons_failures,
    test_size=0.2,
    random_state=42,
    stratify=y_reasons_failures
)

print(f"✓ Data split:")
print(f"  Training set: {len(X_train_reason)} samples")
print(f"  Test set: {len(X_test_reason)} samples")
print()

# Train reason model
print("Training RandomForestClassifier for failure reasons...")
reason_model = RandomForestClassifier(
    n_estimators=300,
    max_depth=15,
    min_samples_split=10,
    min_samples_leaf=4,
    class_weight="balanced_subsample",
    random_state=42,
    n_jobs=-1,
    verbose=0
)

reason_model.fit(X_train_reason, y_train_reason)
print("✓ Model training complete")
print()

# Evaluate reason model
print("Evaluating on test set...")
y_pred_reason = reason_model.predict(X_test_reason)
accuracy_reason = accuracy_score(y_test_reason, y_pred_reason)
print(f"✓ Accuracy: {accuracy_reason * 100:.2f}%")
print()

print("Classification Report:")
print("-" * 80)
target_names = [FAILURE_REASON_MAP[i] for i in sorted(FAILURE_REASON_MAP.keys())]
print(classification_report(y_test_reason, y_pred_reason, target_names=target_names))

print("Confusion Matrix:")
print("-" * 80)
cm_reason = confusion_matrix(y_test_reason, y_pred_reason)
print("Predicted →")
print("Actual ↓")
print(cm_reason)
print()

# Save reason model
print(f"Saving reason model to {REASON_MODEL_PATH}...")
joblib.dump(reason_model, REASON_MODEL_PATH)
print("✓ Reason model saved")
print()

# Also save the label mapping as a separate file for reference
label_map_path = "app/models/failure_reason_labels.json"
import json
with open(label_map_path, 'w') as f:
    json.dump(FAILURE_REASON_MAP, f, indent=2)
print(f"✓ Failure reason label mapping saved to {label_map_path}")
print()

print("=" * 80)
print("TRAINING COMPLETE")
print("=" * 80)
print()

print("Summary:")
print(f"  ✓ Failure model saved to: {FAILURE_MODEL_PATH}")
print(f"  ✓ Reason model saved to: {REASON_MODEL_PATH}")
print(f"  ✓ Failure model accuracy: {accuracy * 100:.2f}%")
print(f"  ✓ Reason model accuracy: {accuracy_reason * 100:.2f}%")
print(f"  ✓ Models ready for API use")
print()

print("Next steps:")
print("  1. Restart the API server (it will auto-reload with new models)")
print("  2. Re-run the test: python test_machine_logs.py")
print("  3. Verify improved accuracy and readable failure reasons")
print()

print("Expected improvements:")
print("  - Accuracy should be > 90%")
print("  - Precision should be reasonable (not 3%)")
print("  - Recall should not be 100%")
print("  - Failure reasons will show as readable text (e.g., 'Tool Wear Failure')")
print("  - Model will not predict 100% failures")
print()

print("=" * 80)
