#!/usr/bin/env python3
"""
Filely Backend API Testing - Enhanced Features
Tests the new enhanced backend endpoints for transaction editing, history, and filtering.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://vat-tracker-ae.preview.emergentagent.com/api"
TIMEOUT = 15  # 15 seconds timeout for AI endpoints
ORG_ID = "default"

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_icon} {test_name}: {status}")
    if details:
        print(f"    {details}")

def make_request(method, endpoint, data=None, timeout=10):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, timeout=timeout)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=timeout)
        elif method == "PUT":
            response = requests.put(url, json=data, timeout=timeout)
        
        return response
    except requests.exceptions.Timeout:
        print(f"    ⚠️ Request timeout after {timeout}s")
        return None
    except Exception as e:
        print(f"    ❌ Request error: {str(e)}")
        return None

def test_enhanced_backend():
    """Test all enhanced backend features"""
    print("🚀 Starting Enhanced Filely Backend API Tests")
    print(f"📍 Base URL: {BASE_URL}")
    print("=" * 60)
    
    # Step 1: Get existing transactions to work with
    print("\n📋 Step 1: Getting existing transactions...")
    response = make_request("GET", "/files")
    
    if not response or response.status_code != 200:
        log_test("Get Files", "FAIL", "Cannot retrieve existing transactions")
        return False
    
    files_data = response.json()
    transactions = files_data.get('files', [])
    
    if not transactions:
        log_test("Get Files", "FAIL", "No transactions found to test with")
        return False
    
    log_test("Get Files", "PASS", f"Found {len(transactions)} transactions")
    
    # Get the first transaction for testing
    test_transaction = transactions[0]
    transaction_id = test_transaction['id']
    original_merchant = test_transaction.get('customName') or test_transaction.get('merchant')
    original_category = test_transaction.get('category')
    original_amount = test_transaction.get('amount')
    
    print(f"    Using transaction: {original_merchant} ({transaction_id})")
    
    # Step 2: Test PUT /api/files/edit - Edit transaction name
    print("\n✏️ Step 2: Testing transaction editing...")
    
    # Test 2a: Change merchant name
    edit_data = {
        "id": transaction_id,
        "merchant": "ADNOC Station 5",
        "editedBy": "test-user"
    }
    
    response = make_request("PUT", "/files/edit", edit_data)
    
    if not response or response.status_code != 200:
        log_test("Edit Transaction - Name", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    edit_result = response.json()
    
    if 'changes' not in edit_result or 'historyEntry' not in edit_result:
        log_test("Edit Transaction - Name", "FAIL", "Missing changes or historyEntry in response")
        return False
    
    changes = edit_result['changes']
    history_entry = edit_result['historyEntry']
    
    if not changes or changes[0]['field'] != 'name':
        log_test("Edit Transaction - Name", "FAIL", "Changes array missing or incorrect")
        return False
    
    if not history_entry.get('timestamp') or not history_entry.get('editedBy'):
        log_test("Edit Transaction - Name", "FAIL", "History entry missing timestamp or editedBy")
        return False
    
    log_test("Edit Transaction - Name", "PASS", f"Changed name from '{changes[0]['from']}' to '{changes[0]['to']}'")
    
    # Test 2b: Change category
    edit_data = {
        "id": transaction_id,
        "category": "Transport",
        "editedBy": "test-user"
    }
    
    response = make_request("PUT", "/files/edit", edit_data)
    
    if not response or response.status_code != 200:
        log_test("Edit Transaction - Category", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    edit_result = response.json()
    changes = edit_result.get('changes', [])
    
    if not changes or changes[0]['field'] != 'category':
        log_test("Edit Transaction - Category", "FAIL", "Category change not recorded properly")
        return False
    
    log_test("Edit Transaction - Category", "PASS", f"Changed category from '{changes[0]['from']}' to '{changes[0]['to']}'")
    
    # Test 2c: Change amount
    new_amount = 300.0
    edit_data = {
        "id": transaction_id,
        "amount": new_amount,
        "editedBy": "test-user"
    }
    
    response = make_request("PUT", "/files/edit", edit_data)
    
    if not response or response.status_code != 200:
        log_test("Edit Transaction - Amount", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    edit_result = response.json()
    changes = edit_result.get('changes', [])
    
    if not changes or changes[0]['field'] != 'amount':
        log_test("Edit Transaction - Amount", "FAIL", "Amount change not recorded properly")
        return False
    
    log_test("Edit Transaction - Amount", "PASS", f"Changed amount from {changes[0]['from']} to {changes[0]['to']} AED")
    
    # Step 3: Test GET /api/files/history - Get edit history
    print("\n📜 Step 3: Testing edit history retrieval...")
    
    response = make_request("GET", f"/files/history?id={transaction_id}")
    
    if not response or response.status_code != 200:
        log_test("Get Edit History", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    history_data = response.json()
    edit_history = history_data.get('editHistory', [])
    
    if len(edit_history) < 3:  # Should have at least 3 edits from above
        log_test("Get Edit History", "FAIL", f"Expected at least 3 history entries, got {len(edit_history)}")
        return False
    
    # Check if history entries have required fields
    for entry in edit_history:
        if not all(key in entry for key in ['id', 'editedBy', 'changes', 'timestamp']):
            log_test("Get Edit History", "FAIL", "History entry missing required fields")
            return False
    
    log_test("Get Edit History", "PASS", f"Retrieved {len(edit_history)} edit history entries")
    
    # Step 4: Test GET /api/files/export with filters
    print("\n📊 Step 4: Testing enhanced export with filters...")
    
    # Test 4a: Filter by category
    response = make_request("GET", "/files/export?category=Transport")
    
    if not response or response.status_code != 200:
        log_test("Export - Category Filter", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    export_data = response.json()
    
    if 'filters' not in export_data or export_data['filters']['category'] != 'Transport':
        log_test("Export - Category Filter", "FAIL", "Filters not properly applied or returned")
        return False
    
    # Check if filtered transactions match the category
    filtered_transactions = export_data.get('transactions', [])
    for txn in filtered_transactions:
        if txn.get('category') != 'Transport':
            log_test("Export - Category Filter", "FAIL", f"Found non-Transport transaction: {txn.get('category')}")
            return False
    
    log_test("Export - Category Filter", "PASS", f"Filtered {len(filtered_transactions)} Transport transactions")
    
    # Test 4b: Filter by amount range
    response = make_request("GET", "/files/export?amountMin=100&amountMax=500")
    
    if not response or response.status_code != 200:
        log_test("Export - Amount Filter", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    export_data = response.json()
    filters = export_data.get('filters', {})
    
    if filters.get('amountMin') != 100 or filters.get('amountMax') != 500:
        log_test("Export - Amount Filter", "FAIL", "Amount filters not properly applied")
        return False
    
    # Check if filtered transactions are within range
    filtered_transactions = export_data.get('transactions', [])
    for txn in filtered_transactions:
        amount = txn.get('amount', 0)
        if amount < 100 or amount > 500:
            log_test("Export - Amount Filter", "FAIL", f"Transaction amount {amount} outside range 100-500")
            return False
    
    log_test("Export - Amount Filter", "PASS", f"Filtered {len(filtered_transactions)} transactions in range 100-500 AED")
    
    # Test 4c: Filter by date range
    response = make_request("GET", "/files/export?dateFrom=2026-04-01&dateTo=2026-04-30")
    
    if not response or response.status_code != 200:
        log_test("Export - Date Filter", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    export_data = response.json()
    
    if 'dateRange' not in export_data:
        log_test("Export - Date Filter", "FAIL", "Date range not included in response")
        return False
    
    date_range = export_data['dateRange']
    if date_range.get('from') != '2026-04-01' or date_range.get('to') != '2026-04-30':
        log_test("Export - Date Filter", "FAIL", "Date range not properly applied")
        return False
    
    log_test("Export - Date Filter", "PASS", f"Applied date filter: {date_range['from']} to {date_range['to']}")
    
    # Step 5: Test POST /api/chat - Category lookup (AI test with timeout)
    print("\n🤖 Step 5: Testing AI category lookup...")
    
    chat_data = {
        "message": "Show my last shopping bill",
        "sessionId": "test-lookup-2",
        "orgId": ORG_ID
    }
    
    response = make_request("POST", "/chat", chat_data, timeout=TIMEOUT)
    
    if not response:
        log_test("AI Category Lookup", "FAIL", "Request timeout or error")
        return False
    
    if response.status_code != 200:
        log_test("AI Category Lookup", "FAIL", f"Status: {response.status_code}")
        return False
    
    chat_result = response.json()
    ai_message = chat_result.get('message', '')
    extracted_transaction = chat_result.get('extractedTransaction')
    
    # For lookup queries, AI should NOT generate a transaction JSON
    if extracted_transaction:
        log_test("AI Category Lookup", "FAIL", "AI generated transaction JSON for lookup query (should only provide info)")
        return False
    
    if not ai_message or len(ai_message) < 10:
        log_test("AI Category Lookup", "FAIL", "AI response too short or empty")
        return False
    
    log_test("AI Category Lookup", "PASS", f"AI provided lookup info without generating transaction JSON")
    print(f"    AI Response: {ai_message[:100]}...")
    
    # Step 6: Test GET /api/team/activity - Verify edit activities
    print("\n📈 Step 6: Testing team activity feed for edit activities...")
    
    response = make_request("GET", "/team/activity")
    
    if not response or response.status_code != 200:
        log_test("Team Activity Feed", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    activity_data = response.json()
    activities = activity_data.get('activity', [])
    
    if not activities:
        log_test("Team Activity Feed", "FAIL", "No activities found")
        return False
    
    # Look for edit activities (should be recent due to our edits above)
    edit_activities = [a for a in activities if a.get('type') == 'edit']
    
    if not edit_activities:
        log_test("Team Activity Feed", "FAIL", "No edit activities found in feed")
        return False
    
    # Check if activities are sorted by timestamp (latest first)
    timestamps = [a.get('timestamp') for a in activities if a.get('timestamp')]
    if len(timestamps) > 1:
        sorted_timestamps = sorted(timestamps, reverse=True)
        if timestamps != sorted_timestamps:
            log_test("Team Activity Feed", "FAIL", "Activities not sorted by timestamp (latest first)")
            return False
    
    log_test("Team Activity Feed", "PASS", f"Found {len(edit_activities)} edit activities in feed of {len(activities)} total activities")
    
    # Show recent edit activity
    if edit_activities:
        recent_edit = edit_activities[0]
        print(f"    Recent edit: {recent_edit.get('description', 'No description')}")
    
    print("\n" + "=" * 60)
    print("🎉 All Enhanced Backend Tests Completed Successfully!")
    print("✅ Transaction editing with change tracking")
    print("✅ Edit history retrieval")
    print("✅ Enhanced export with filters (category, amount, date)")
    print("✅ AI category lookup without transaction generation")
    print("✅ Team activity feed with edit activities")
    
    return True

if __name__ == "__main__":
    try:
        success = test_enhanced_backend()
        if success:
            print("\n🏆 ALL TESTS PASSED")
            sys.exit(0)
        else:
            print("\n💥 SOME TESTS FAILED")
            sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        sys.exit(1)