import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

def generate_synthetic_data(num_samples=1500):
    np.random.seed(42)
    
    # 1. Generate features
    costs = np.random.uniform(4.99, 24.99, num_samples)
    usage_hours = np.random.uniform(0.0, 35.0, num_samples)
    security_scores = np.random.choice([50, 60, 70, 80, 90, 100], num_samples, p=[0.1, 0.1, 0.2, 0.2, 0.2, 0.2])
    
    # 2. Heuristics for labels:
    # 0 = Not Worth It (Low usage relative to cost, or high cost underutilization)
    # 1 = Use Occasionally (Moderate usage, or high usage but low security risk)
    # 2 = Worth It (Excellent value, low cost-per-hour, and safe)
    labels = []
    for c, u, s in zip(costs, usage_hours, security_scores):
        if u < 2.0:
            labels.append(0)  # Not Worth It (Underutilized)
        elif c > 18.0 and u < 6.0:
            labels.append(0)  # Not Worth It (Expensive & low usage)
        elif u >= 10.0 and (c / u) < 1.0 and s >= 70:
            labels.append(2)  # Worth It (Low hourly cost, safe)
        elif u >= 15.0 and (c / u) < 0.8:
            labels.append(2)  # Worth It (Extremely high usage makes it worth it regardless of security)
        else:
            labels.append(1)  # Use Occasionally
            
    df = pd.DataFrame({
        'cost': costs,
        'usage_hours': usage_hours,
        'security_score': security_scores,
        'label': labels
    })
    
    return df

def train_model():
    print("Generating synthetic subscription usage dataset...")
    df = generate_synthetic_data(1500)
    
    X = df[['cost', 'usage_hours', 'security_score']]
    y = df['label']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Decision Tree Classifier...")
    # Using DecisionTree as it natively represents decision boundary rules perfectly and requires no scaling
    clf = DecisionTreeClassifier(max_depth=5, random_state=42)
    clf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nModel Accuracy: {accuracy * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Not Worth It", "Use Occasionally", "Worth It"]))
    
    # Save the model
    model_path = os.path.join(os.path.dirname(__file__), "recommendation_model.joblib")
    joblib.dump(clf, model_path)
    print(f"Model successfully saved to: {model_path}\n")

if __name__ == "__main__":
    train_model()
