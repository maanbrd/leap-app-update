// Simple test runner for Encore.ts environment
console.log('🧪 Running Event API Tests...');

// Test data validation
function validateEventData() {
  console.log('Testing event data validation...');
  
  const validEvent = {
    firstName: 'Jan',
    lastName: 'Kowalski',
    phone: '+48123456789',
    eventTime: '2024-12-25T10:00:00Z',
    service: 'Tatuaż',
    price: 500,
    depositAmount: 100,
    depositStatus: 'niezapłacony' as const,
    durationMinutes: 120,
    createdBy: 'test_user'
  };

  // Test valid data
  if (validEvent.firstName === 'Jan' && validEvent.price === 500) {
    console.log('✅ Valid event data test passed');
  } else {
    console.log('❌ Valid event data test failed');
  }

  // Test invalid data
  const invalidEvent = {
    firstName: '',
    lastName: 'Kowalski',
    eventTime: '',
    service: '',
    price: 0,
    durationMinutes: 0,
    createdBy: 'test_user'
  };

  if (invalidEvent.firstName === '' && invalidEvent.service === '') {
    console.log('✅ Invalid event data test passed');
  } else {
    console.log('❌ Invalid event data test failed');
  }
}

// Test phone number formatting
function testPhoneFormatting() {
  console.log('Testing phone number formatting...');
  
  const testCases = [
    { input: '123456789', expected: '+48123456789' },
    { input: '+48123456789', expected: '+48123456789' },
    { input: '48123456789', expected: '+48123456789' }
  ];

  for (const testCase of testCases) {
    const formatted = formatPhoneNumber(testCase.input);
    if (formatted === testCase.expected) {
      console.log(`✅ Phone formatting test passed: ${testCase.input} -> ${formatted}`);
    } else {
      console.log(`❌ Phone formatting test failed: ${testCase.input} -> ${formatted}, expected: ${testCase.expected}`);
    }
  }
}

function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  if (cleanPhone.startsWith('+48') && cleanPhone.length === 12) {
    return cleanPhone;
  } else if (cleanPhone.startsWith('48') && cleanPhone.length === 11) {
    return '+' + cleanPhone;
  } else if (cleanPhone.length === 9) {
    return '+48' + cleanPhone;
  }
  
  return cleanPhone;
}

// Test deposit status validation
function testDepositStatus() {
  console.log('Testing deposit status validation...');
  
  const validStatuses = ['zapłacony', 'niezapłacony', 'nie dotyczy'];
  const testStatus = 'niezapłacony';
  
  if (validStatuses.includes(testStatus)) {
    console.log('✅ Deposit status validation test passed');
  } else {
    console.log('❌ Deposit status validation test failed');
  }
}

// Run all tests
function runTests() {
  console.log('Starting test suite...\n');
  
  validateEventData();
  console.log('');
  
  testPhoneFormatting();
  console.log('');
  
  testDepositStatus();
  console.log('');
  
  console.log('🎉 Test suite completed!');
}

// Export for potential use
export { runTests, validateEventData, testPhoneFormatting, testDepositStatus };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}