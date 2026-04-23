import requests

try:
    response = requests.post(
        "http://127.0.0.1:8000/api/v1/auth/login",
        json={"email": "admin@gnn-vp.com", "password": "admin123"}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
