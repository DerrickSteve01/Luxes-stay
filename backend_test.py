#!/usr/bin/env python3
"""
Comprehensive Backend Authentication System Tests
Tests all authentication endpoints and security features
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://4862a84e-cf94-41dd-ab2a-7787263e6a0c.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class AuthenticationTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.test_results = []
        self.valid_token = None
        self.test_user_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
        
    def log_test(self, test_name, passed, details=""):
        """Log test results"""
        status = "✅ PASS" if passed else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "passed": passed,
            "details": details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()

    def test_user_registration_success(self):
        """Test successful user registration with valid data"""
        test_name = "User Registration - Valid Data"
        
        payload = {
            "email": self.test_user_email,
            "password": "SecurePass123!",
            "first_name": "John",
            "last_name": "Doe"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/register", 
                                   json=payload, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                # Check response structure
                if all(key in data for key in ["access_token", "token_type", "user"]):
                    # Store token for later tests
                    self.valid_token = data["access_token"]
                    user_data = data["user"]
                    
                    # Verify user data
                    if (user_data["email"] == self.test_user_email and 
                        user_data["first_name"] == "John" and
                        user_data["last_name"] == "Doe" and
                        "id" in user_data):
                        self.log_test(test_name, True, "Registration successful with JWT token")
                    else:
                        self.log_test(test_name, False, "Invalid user data in response")
                else:
                    self.log_test(test_name, False, "Missing required fields in response")
            else:
                self.log_test(test_name, False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test(test_name, False, f"Request failed: {str(e)}")

    def test_password_validation(self):
        """Test password strength validation"""
        test_cases = [
            ("weak", "Password must be at least 8 characters long"),
            ("weakpass", "Password must contain at least one uppercase letter"),
            ("WEAKPASS", "Password must contain at least one lowercase letter"),
            ("WeakPass", "Password must contain at least one number"),
            ("WeakPass1", "Password must contain at least one special character")
        ]
        
        for password, expected_error in test_cases:
            test_name = f"Password Validation - {password}"
            
            payload = {
                "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
                "password": password,
                "first_name": "Test",
                "last_name": "User"
            }
            
            try:
                response = requests.post(f"{self.base_url}/auth/register", 
                                       json=payload, headers=self.headers, timeout=10)
                
                if response.status_code == 400:
                    error_data = response.json()
                    if "Password validation failed" in str(error_data):
                        self.log_test(test_name, True, "Password validation working correctly")
                    else:
                        self.log_test(test_name, False, f"Unexpected error: {error_data}")
                else:
                    self.log_test(test_name, False, f"Expected 400, got {response.status_code}")
                    
            except Exception as e:
                self.log_test(test_name, False, f"Request failed: {str(e)}")

    def test_duplicate_email_prevention(self):
        """Test duplicate email prevention"""
        test_name = "Duplicate Email Prevention"
        
        # Try to register with the same email again
        payload = {
            "email": self.test_user_email,  # Same email as first registration
            "password": "AnotherPass123!",
            "first_name": "Jane",
            "last_name": "Smith"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/register", 
                                   json=payload, headers=self.headers, timeout=10)
            
            if response.status_code == 400:
                error_data = response.json()
                if "Email already registered" in str(error_data):
                    self.log_test(test_name, True, "Duplicate email correctly rejected")
                else:
                    self.log_test(test_name, False, f"Unexpected error: {error_data}")
            else:
                self.log_test(test_name, False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test(test_name, False, f"Request failed: {str(e)}")

    def test_user_login_success(self):
        """Test successful login with correct credentials"""
        test_name = "User Login - Valid Credentials"
        
        payload = {
            "email": self.test_user_email,
            "password": "SecurePass123!"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", 
                                   json=payload, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if all(key in data for key in ["access_token", "token_type", "user"]):
                    # Update token for later tests
                    self.valid_token = data["access_token"]
                    self.log_test(test_name, True, "Login successful with JWT token")
                else:
                    self.log_test(test_name, False, "Missing required fields in response")
            else:
                self.log_test(test_name, False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test(test_name, False, f"Request failed: {str(e)}")

    def test_login_wrong_password(self):
        """Test login failure with wrong password"""
        test_name = "User Login - Wrong Password"
        
        payload = {
            "email": self.test_user_email,
            "password": "WrongPassword123!"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", 
                                   json=payload, headers=self.headers, timeout=10)
            
            if response.status_code == 401:
                error_data = response.json()
                if "Incorrect email or password" in str(error_data):
                    self.log_test(test_name, True, "Wrong password correctly rejected")
                else:
                    self.log_test(test_name, False, f"Unexpected error: {error_data}")
            else:
                self.log_test(test_name, False, f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_test(test_name, False, f"Request failed: {str(e)}")

    def test_login_nonexistent_email(self):
        """Test login failure with non-existent email"""
        test_name = "User Login - Non-existent Email"
        
        payload = {
            "email": f"nonexistent_{uuid.uuid4().hex[:8]}@example.com",
            "password": "SomePassword123!"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", 
                                   json=payload, headers=self.headers, timeout=10)
            
            if response.status_code == 401:
                error_data = response.json()
                if "Incorrect email or password" in str(error_data):
                    self.log_test(test_name, True, "Non-existent email correctly rejected")
                else:
                    self.log_test(test_name, False, f"Unexpected error: {error_data}")
            else:
                self.log_test(test_name, False, f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_test(test_name, False, f"Request failed: {str(e)}")

    def test_protected_route_valid_token(self):
        """Test protected route with valid JWT token"""
        test_name = "Protected Route - Valid Token"
        
        if not self.valid_token:
            self.log_test(test_name, False, "No valid token available for testing")
            return
            
        headers = {
            **self.headers,
            "Authorization": f"Bearer {self.valid_token}"
        }
        
        try:
            response = requests.get(f"{self.base_url}/auth/me", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                user_data = response.json()
                if (user_data["email"] == self.test_user_email and 
                    "id" in user_data and "first_name" in user_data):
                    self.log_test(test_name, True, "Protected route accessible with valid token")
                else:
                    self.log_test(test_name, False, "Invalid user data returned")
            else:
                self.log_test(test_name, False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test(test_name, False, f"Request failed: {str(e)}")

    def test_protected_route_no_token(self):
        """Test protected route without token"""
        test_name = "Protected Route - No Token"
        
        try:
            response = requests.get(f"{self.base_url}/auth/me", 
                                  headers=self.headers, timeout=10)
            
            if response.status_code == 403:
                self.log_test(test_name, True, "Protected route correctly blocked without token")
            elif response.status_code == 401:
                self.log_test(test_name, True, "Protected route correctly blocked without token (401)")
            else:
                self.log_test(test_name, False, f"Expected 401/403, got {response.status_code}")
                
        except Exception as e:
            self.log_test(test_name, False, f"Request failed: {str(e)}")

    def test_protected_route_invalid_token(self):
        """Test protected route with invalid token"""
        test_name = "Protected Route - Invalid Token"
        
        headers = {
            **self.headers,
            "Authorization": "Bearer invalid_token_12345"
        }
        
        try:
            response = requests.get(f"{self.base_url}/auth/me", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 401:
                error_data = response.json()
                if "Could not validate credentials" in str(error_data):
                    self.log_test(test_name, True, "Invalid token correctly rejected")
                else:
                    self.log_test(test_name, True, "Invalid token rejected (different error message)")
            else:
                self.log_test(test_name, False, f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_test(test_name, False, f"Request failed: {str(e)}")

    def test_server_connectivity(self):
        """Test basic server connectivity"""
        test_name = "Server Connectivity"
        
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            
            if response.status_code == 200:
                self.log_test(test_name, True, "Server is accessible")
            else:
                self.log_test(test_name, False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test(test_name, False, f"Server not accessible: {str(e)}")

    def run_all_tests(self):
        """Run all authentication tests"""
        print("=" * 60)
        print("AUTHENTICATION SYSTEM TESTING")
        print("=" * 60)
        print(f"Testing against: {self.base_url}")
        print(f"Test user email: {self.test_user_email}")
        print("=" * 60)
        print()
        
        # Test server connectivity first
        self.test_server_connectivity()
        
        # Test registration flow
        self.test_user_registration_success()
        self.test_password_validation()
        self.test_duplicate_email_prevention()
        
        # Test login flow
        self.test_user_login_success()
        self.test_login_wrong_password()
        self.test_login_nonexistent_email()
        
        # Test protected routes
        self.test_protected_route_valid_token()
        self.test_protected_route_no_token()
        self.test_protected_route_invalid_token()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["passed"])
        total = len(self.test_results)
        
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
        
        print("=" * 60)
        print(f"TOTAL: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED!")
        else:
            print(f"⚠️  {total - passed} tests failed")
        
        print("=" * 60)
        
        return passed == total

if __name__ == "__main__":
    tester = AuthenticationTester()
    all_passed = tester.run_all_tests()
    
    if not all_passed:
        exit(1)