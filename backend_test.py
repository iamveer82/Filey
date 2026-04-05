#!/usr/bin/env python3
"""
Filely UAE Finance Tracker - Backend API Testing
Tests all backend endpoints for the finance tracking application.
"""

import requests
import json
import base64
import time
from PIL import Image, ImageDraw, ImageFont
import io
import os
from datetime import datetime

# Configuration
BASE_URL = "https://vat-tracker-ae.preview.emergentagent.com/api"
TIMEOUT = 15  # Increased timeout for AI endpoints

def create_test_receipt_image():
    """Create a test receipt image with realistic content"""
    try:
        # Create a simple receipt-like image
        img = Image.new('RGB', (400, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a basic font, fallback to default if not available
        try:
            font = ImageFont.load_default()
        except:
            font = None
        
        # Draw receipt content
        y_pos = 20
        receipt_lines = [
            "ADNOC STATION",
            "TRN: 100474993400003",
            "Al Wasl Road, Dubai",
            "========================",
            "Fuel - Super 98",
            "Quantity: 25.5L",
            "Price/L: 2.94 AED",
            "========================",
            "Subtotal: 75.00 AED",
            "VAT (5%): 3.75 AED",
            "Total: 78.75 AED",
            "========================",
            "Payment: Credit Card",
            f"Date: {datetime.now().strftime('%Y-%m-%d')}",
            "Time: 14:30:25",
            "Thank you!"
        ]
        
        for line in receipt_lines:
            draw.text((20, y_pos), line, fill='black', font=font)
            y_pos += 25
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        img_data = buffer.getvalue()
        return base64.b64encode(img_data).decode('utf-8')
    
    except Exception as e:
        print(f"Error creating test image: {e}")
        # Fallback: create minimal image
        img = Image.new('RGB', (200, 300), color='white')
        draw = ImageDraw.Draw(img)
        draw.text((10, 10), "ADNOC Receipt", fill='black')
        draw.text((10, 40), "Total: 75 AED", fill='black')
        draw.text((10, 70), "VAT: 3.75 AED", fill='black')
        
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        img_data = buffer.getvalue()
        return base64.b64encode(img_data).decode('utf-8')

def test_health_check():
    """Test health check endpoint"""
    print("\n=== Testing Health Check ===")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'ok':
                print("✅ Health check passed")
                return True
            else:
                print("❌ Health check failed - invalid response")
                return False
        else:
            print(f"❌ Health check failed - status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_ai_chat():
    """Test AI chat endpoint with expense parsing"""
    print("\n=== Testing AI Chat - Text Expense Parsing ===")
    try:
        payload = {
            "message": "Paid 75 AED at ADNOC for fuel",
            "sessionId": "test-session-1"
        }
        
        print(f"Sending: {payload}")
        response = requests.post(f"{BASE_URL}/chat", json=payload, timeout=TIMEOUT)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"AI Response: {data.get('message', 'No message')}")
            
            extracted = data.get('extractedTransaction')
            if extracted:
                print(f"✅ Extracted Transaction: {json.dumps(extracted, indent=2)}")
                
                # Verify key fields
                required_fields = ['merchant', 'amount', 'currency', 'category']
                missing_fields = [field for field in required_fields if not extracted.get(field)]
                
                if not missing_fields:
                    print("✅ AI chat with transaction extraction passed")
                    return True
                else:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return False
            else:
                print("❌ No transaction extracted from AI response")
                return False
        else:
            print(f"❌ AI chat failed - status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ AI chat error: {e}")
        return False

def test_receipt_scan():
    """Test receipt scanning endpoint"""
    print("\n=== Testing AI Receipt Scan ===")
    try:
        # Create test receipt image
        print("Creating test receipt image...")
        test_image = create_test_receipt_image()
        
        payload = {
            "image": test_image,
            "mimeType": "image/jpeg",
            "sessionId": "test-scan-1"
        }
        
        print("Sending receipt for scanning...")
        response = requests.post(f"{BASE_URL}/scan", json=payload, timeout=TIMEOUT)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Scan Response: {data.get('message', 'No message')}")
            
            extracted = data.get('extractedTransaction')
            if extracted:
                print(f"✅ Extracted from Receipt: {json.dumps(extracted, indent=2)}")
                print("✅ Receipt scan passed")
                return True
            else:
                print("❌ No transaction extracted from receipt")
                return False
        else:
            print(f"❌ Receipt scan failed - status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Receipt scan error: {e}")
        return False

def test_create_transaction():
    """Test transaction creation"""
    print("\n=== Testing Create Transaction ===")
    try:
        payload = {
            "merchant": "Emirates NBD",
            "amount": 150.00,
            "currency": "AED",
            "vat": 7.50,
            "category": "Banking",
            "payment_method": "Debit Card",
            "description": "Account maintenance fee"
        }
        
        print(f"Creating transaction: {payload}")
        response = requests.post(f"{BASE_URL}/transactions", json=payload, timeout=TIMEOUT)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            transaction = data.get('transaction')
            if transaction and transaction.get('id'):
                print(f"✅ Transaction created: {transaction.get('id')}")
                print(f"Transaction details: {json.dumps(transaction, indent=2)}")
                return True
            else:
                print("❌ Transaction creation failed - no transaction returned")
                return False
        else:
            print(f"❌ Transaction creation failed - status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Transaction creation error: {e}")
        return False

def test_get_transactions():
    """Test getting transactions list"""
    print("\n=== Testing Get Transactions ===")
    try:
        response = requests.get(f"{BASE_URL}/transactions", timeout=TIMEOUT)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            transactions = data.get('transactions', [])
            print(f"✅ Retrieved {len(transactions)} transactions")
            
            if transactions:
                print(f"Sample transaction: {json.dumps(transactions[0], indent=2)}")
            
            return True
        else:
            print(f"❌ Get transactions failed - status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Get transactions error: {e}")
        return False

def test_dashboard():
    """Test dashboard stats endpoint"""
    print("\n=== Testing Dashboard Stats ===")
    try:
        response = requests.get(f"{BASE_URL}/dashboard", timeout=TIMEOUT)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ['totalSpend', 'totalVat', 'transactionCount', 'recentTransactions']
            
            print(f"Dashboard data: {json.dumps(data, indent=2)}")
            
            missing_fields = [field for field in required_fields if field not in data]
            if not missing_fields:
                print("✅ Dashboard stats passed")
                return True
            else:
                print(f"❌ Missing dashboard fields: {missing_fields}")
                return False
        else:
            print(f"❌ Dashboard failed - status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Dashboard error: {e}")
        return False

def test_team_management():
    """Test team management endpoints"""
    print("\n=== Testing Team Management ===")
    try:
        # Test get team
        print("Getting team...")
        response = requests.get(f"{BASE_URL}/team", timeout=TIMEOUT)
        print(f"Get Team Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Get team failed - status {response.status_code}")
            return False
        
        team_data = response.json()
        print(f"Team data: {json.dumps(team_data, indent=2)}")
        
        # Test invite team member
        print("Inviting team member...")
        invite_payload = {
            "name": "Ahmed Al-Rashid",
            "email": "ahmed@company.ae",
            "role": "accountant"
        }
        
        response = requests.post(f"{BASE_URL}/team/invite", json=invite_payload, timeout=TIMEOUT)
        print(f"Invite Status: {response.status_code}")
        
        if response.status_code == 200:
            invite_data = response.json()
            print(f"✅ Team member invited: {invite_data}")
            
            # Test team activity
            print("Getting team activity...")
            response = requests.get(f"{BASE_URL}/team/activity", timeout=TIMEOUT)
            if response.status_code == 200:
                activity_data = response.json()
                print(f"✅ Team activity: {len(activity_data.get('activity', []))} activities")
                return True
            else:
                print(f"❌ Team activity failed - status {response.status_code}")
                return False
        else:
            print(f"❌ Team invite failed - status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Team management error: {e}")
        return False

def test_profile_settings():
    """Test profile settings endpoints"""
    print("\n=== Testing Profile Settings ===")
    try:
        # Test get profile
        print("Getting profile...")
        response = requests.get(f"{BASE_URL}/settings/profile", timeout=TIMEOUT)
        print(f"Get Profile Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Get profile failed - status {response.status_code}")
            return False
        
        profile_data = response.json()
        print(f"Profile data: {json.dumps(profile_data, indent=2)}")
        
        # Test update profile
        print("Updating profile...")
        update_payload = {
            "name": "Khalid Al-Mansouri",
            "email": "khalid@filely.ae",
            "company": "Dubai Tech Solutions LLC"
        }
        
        response = requests.put(f"{BASE_URL}/settings/profile", json=update_payload, timeout=TIMEOUT)
        print(f"Update Profile Status: {response.status_code}")
        
        if response.status_code == 200:
            update_data = response.json()
            print(f"✅ Profile updated: {update_data}")
            return True
        else:
            print(f"❌ Profile update failed - status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Profile settings error: {e}")
        return False

def test_chat_sessions():
    """Test chat sessions and messages endpoints"""
    print("\n=== Testing Chat Sessions & Messages ===")
    try:
        # Test get chat sessions
        print("Getting chat sessions...")
        response = requests.get(f"{BASE_URL}/chat/sessions", timeout=TIMEOUT)
        print(f"Chat Sessions Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Get chat sessions failed - status {response.status_code}")
            return False
        
        sessions_data = response.json()
        print(f"Chat sessions: {len(sessions_data.get('sessions', []))} sessions")
        
        # Test get messages for a session
        print("Getting messages for test session...")
        response = requests.get(f"{BASE_URL}/chat/messages?sessionId=test-session-1", timeout=TIMEOUT)
        print(f"Chat Messages Status: {response.status_code}")
        
        if response.status_code == 200:
            messages_data = response.json()
            print(f"✅ Chat messages: {len(messages_data.get('messages', []))} messages")
            return True
        else:
            print(f"❌ Get chat messages failed - status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Chat sessions error: {e}")
        return False

def main():
    """Run all backend tests"""
    print("🚀 Starting Filely UAE Finance Tracker Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print("=" * 60)
    
    test_results = {}
    
    # Run all tests
    test_results['health'] = test_health_check()
    test_results['ai_chat'] = test_ai_chat()
    test_results['receipt_scan'] = test_receipt_scan()
    test_results['create_transaction'] = test_create_transaction()
    test_results['get_transactions'] = test_get_transactions()
    test_results['dashboard'] = test_dashboard()
    test_results['team_management'] = test_team_management()
    test_results['profile_settings'] = test_profile_settings()
    test_results['chat_sessions'] = test_chat_sessions()
    
    # Summary
    print("\n" + "=" * 60)
    print("🏁 BACKEND API TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend API tests passed!")
        return True
    else:
        print(f"⚠️  {total - passed} tests failed")
        return False

if __name__ == "__main__":
    main()