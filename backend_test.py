#!/usr/bin/env python3
"""
Backend API Testing Script for Filely UAE Finance Tracker
Tests new endpoints: files, files/rename, files/export, team/chat
Also verifies existing endpoints: health, dashboard, team
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from .env
BASE_URL = "https://vat-tracker-ae.preview.emergentagent.com/api"

def test_endpoint(method, endpoint, data=None, params=None, description=""):
    """Test an API endpoint and return response"""
    url = f"{BASE_URL}/{endpoint}"
    
    try:
        print(f"\n🧪 Testing {method} {endpoint}")
        if description:
            print(f"   Description: {description}")
        
        if method == "GET":
            response = requests.get(url, params=params, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        elif method == "PUT":
            response = requests.put(url, json=data, timeout=10)
        else:
            print(f"❌ Unsupported method: {method}")
            return None
            
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                json_data = response.json()
                print(f"   ✅ SUCCESS: {response.status_code}")
                return json_data
            except:
                print(f"   ✅ SUCCESS: {response.status_code} (non-JSON response)")
                return {"status": "ok", "text": response.text}
        else:
            print(f"   ❌ FAILED: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Error: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ REQUEST ERROR: {str(e)}")
        return None
    except Exception as e:
        print(f"   ❌ UNEXPECTED ERROR: {str(e)}")
        return None

def main():
    print("=" * 60)
    print("🚀 FILELY UAE FINANCE TRACKER - BACKEND API TESTING")
    print("=" * 60)
    
    results = {}
    
    # ============ EXISTING ENDPOINTS VERIFICATION ============
    print("\n📋 TESTING EXISTING ENDPOINTS")
    
    # 1. Health Check
    health_result = test_endpoint("GET", "health", description="Health check endpoint")
    results["health"] = health_result is not None
    
    # 2. Dashboard Stats
    dashboard_result = test_endpoint("GET", "dashboard", description="Dashboard statistics")
    results["dashboard"] = dashboard_result is not None
    if dashboard_result:
        required_fields = ["totalSpend", "totalVat", "transactionCount", "recentTransactions"]
        missing_fields = [f for f in required_fields if f not in dashboard_result]
        if missing_fields:
            print(f"   ⚠️  Missing fields: {missing_fields}")
        else:
            print(f"   📊 Dashboard data: {dashboard_result.get('totalSpend', 0)} AED total, {dashboard_result.get('transactionCount', 0)} transactions")
    
    # 3. Team Management
    team_result = test_endpoint("GET", "team", description="Team information")
    results["team"] = team_result is not None
    if team_result and "team" in team_result:
        team_data = team_result["team"]
        print(f"   👥 Team: {team_data.get('name', 'Unknown')} with {len(team_data.get('members', []))} members")
    
    # ============ NEW ENDPOINTS TESTING ============
    print("\n🆕 TESTING NEW ENDPOINTS")
    
    # 4. GET /api/files - File listing
    files_result = test_endpoint("GET", "files", description="Get all processed transactions/files")
    results["files_get"] = files_result is not None
    transaction_id = None
    
    if files_result and "files" in files_result:
        files = files_result["files"]
        print(f"   📁 Found {len(files)} files/transactions")
        if files:
            transaction_id = files[0].get("id")
            print(f"   📄 Sample transaction: {files[0].get('merchant', 'Unknown')} - {files[0].get('amount', 0)} AED")
        else:
            print("   ℹ️  No transactions found - creating a test transaction")
            # Create a test transaction for rename testing
            test_transaction = {
                "merchant": "Test Merchant for Rename",
                "amount": 100.0,
                "vat": 5.0,
                "category": "General",
                "payment_method": "Cash",
                "description": "Test transaction for rename functionality"
            }
            create_result = test_endpoint("POST", "transactions", data=test_transaction, description="Create test transaction")
            if create_result and "transaction" in create_result:
                transaction_id = create_result["transaction"]["id"]
                print(f"   ✅ Created test transaction with ID: {transaction_id}")
    
    # 5. PUT /api/files/rename - Rename file
    if transaction_id:
        rename_data = {
            "id": transaction_id,
            "customName": "April Fuel Expense"
        }
        rename_result = test_endpoint("PUT", "files/rename", data=rename_data, description="Rename a transaction/file")
        results["files_rename"] = rename_result is not None
        if rename_result:
            print(f"   ✏️  Renamed transaction to: {rename_data['customName']}")
    else:
        print("   ⚠️  Skipping rename test - no transaction ID available")
        results["files_rename"] = False
    
    # 6. GET /api/files/export - Export data
    export_result = test_endpoint("GET", "files/export", description="Get PDF export data")
    results["files_export"] = export_result is not None
    if export_result:
        required_export_fields = ["reportId", "transactions", "subtotal", "totalVat", "grandTotal"]
        missing_export_fields = [f for f in required_export_fields if f not in export_result]
        if missing_export_fields:
            print(f"   ⚠️  Missing export fields: {missing_export_fields}")
        else:
            print(f"   📊 Export data: Report {export_result.get('reportId', 'Unknown')}, {len(export_result.get('transactions', []))} transactions")
            print(f"   💰 Totals: Subtotal {export_result.get('subtotal', 0)} AED, VAT {export_result.get('totalVat', 0)} AED, Grand Total {export_result.get('grandTotal', 0)} AED")
    
    # 7. GET /api/team/chat - Get team chat messages
    team_chat_get_result = test_endpoint("GET", "team/chat", description="Get team chat messages")
    results["team_chat_get"] = team_chat_get_result is not None
    if team_chat_get_result and "messages" in team_chat_get_result:
        messages = team_chat_get_result["messages"]
        print(f"   💬 Found {len(messages)} team chat messages")
    
    # 8. POST /api/team/chat - Send team chat message
    chat_message_data = {
        "message": "Team meeting at 3pm - Backend API Testing",
        "userName": "Admin"
    }
    team_chat_post_result = test_endpoint("POST", "team/chat", data=chat_message_data, description="Send team chat message")
    results["team_chat_post"] = team_chat_post_result is not None
    if team_chat_post_result and "chatMessage" in team_chat_post_result:
        sent_message = team_chat_post_result["chatMessage"]
        print(f"   📤 Sent message: '{sent_message.get('message', 'Unknown')}' by {sent_message.get('userName', 'Unknown')}")
    
    # 9. Verify GET /api/team/chat returns the sent message
    print("\n🔄 VERIFYING SENT MESSAGE")
    team_chat_verify_result = test_endpoint("GET", "team/chat", description="Verify sent message appears in chat")
    results["team_chat_verify"] = False
    if team_chat_verify_result and "messages" in team_chat_verify_result:
        messages = team_chat_verify_result["messages"]
        sent_message_found = any(msg.get("message") == chat_message_data["message"] for msg in messages)
        if sent_message_found:
            print("   ✅ Sent message found in chat history")
            results["team_chat_verify"] = True
        else:
            print("   ❌ Sent message NOT found in chat history")
    
    # ============ RESULTS SUMMARY ============
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    print(f"\n✅ PASSED: {passed}/{total} tests")
    print(f"❌ FAILED: {total - passed}/{total} tests")
    
    print("\nDetailed Results:")
    test_names = {
        "health": "Health Check API",
        "dashboard": "Dashboard Stats API", 
        "team": "Team Management API",
        "files_get": "GET /api/files (File Listing)",
        "files_rename": "PUT /api/files/rename (Rename File)",
        "files_export": "GET /api/files/export (Export Data)",
        "team_chat_get": "GET /api/team/chat (Get Messages)",
        "team_chat_post": "POST /api/team/chat (Send Message)",
        "team_chat_verify": "Team Chat Message Verification"
    }
    
    for test_key, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        test_name = test_names.get(test_key, test_key)
        print(f"  {status} - {test_name}")
    
    # Critical issues check
    critical_failures = []
    if not results.get("health"):
        critical_failures.append("Health Check API")
    if not results.get("files_get"):
        critical_failures.append("Files Listing API")
    if not results.get("team_chat_post"):
        critical_failures.append("Team Chat Send API")
    
    if critical_failures:
        print(f"\n🚨 CRITICAL FAILURES: {', '.join(critical_failures)}")
        return False
    else:
        print(f"\n🎉 ALL CRITICAL ENDPOINTS WORKING!")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)