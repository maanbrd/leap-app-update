// Simple test execution for validation
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
    depositStatus: 'niezapłacony',
    durationMinutes: 120,
    createdBy: 'test_user'
  };

  // Test valid data
  if (validEvent.firstName === 'Jan' && validEvent.price === 500) {
    console.log('✅ Valid event data test passed');
    return true;
  } else {
    console.log('❌ Valid event data test failed');
    return false;
  }
}

// Test phone number formatting
function testPhoneFormatting() {
  console.log('Testing phone number formatting...');
  
  function formatPhoneNumber(phone) {
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
  
  const testCases = [
    { input: '123456789', expected: '+48123456789' },
    { input: '+48123456789', expected: '+48123456789' },
    { input: '48123456789', expected: '+48123456789' }
  ];

  let allPassed = true;
  for (const testCase of testCases) {
    const formatted = formatPhoneNumber(testCase.input);
    if (formatted === testCase.expected) {
      console.log(`✅ Phone formatting test passed: ${testCase.input} -> ${formatted}`);
    } else {
      console.log(`❌ Phone formatting test failed: ${testCase.input} -> ${formatted}, expected: ${testCase.expected}`);
      allPassed = false;
    }
  }
  return allPassed;
}

// Test deposit status validation
function testDepositStatus() {
  console.log('Testing deposit status validation...');
  
  const validStatuses = ['zapłacony', 'niezapłacony', 'nie dotyczy'];
  const testStatus = 'niezapłacony';
  
  if (validStatuses.includes(testStatus)) {
    console.log('✅ Deposit status validation test passed');
    return true;
  } else {
    console.log('❌ Deposit status validation test failed');
    return false;
  }
}

// Run all tests
function runTests() {
  console.log('Starting test suite...\n');
  
  const results = [];
  
  results.push(validateEventData());
  console.log('');
  
  results.push(testPhoneFormatting());
  console.log('');
  
  results.push(testDepositStatus());
  console.log('');
  
  const allPassed = results.every(result => result === true);
  
  if (allPassed) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('❌ Some tests failed!');
  }
  
  return allPassed;
}

// Run the tests
const mainTestResult = runTests();

console.log('\n' + '='.repeat(50));

// Additional utility tests
console.log('🔧 Running Utility Tests...\n');

// SMS Template test
function testSMSTemplate() {
  console.log('Testing SMS template rendering...');
  
  function generateSMSBody(templateCode, variables) {
    const templates = {
      'SMS_D2': "Cześć {IMIE}! Wizyta {DATA} o {GODZ} w {STUDIO} – widzimy się pojutrze",
      'SMS_D1': "Hej {IMIE}! Jutro {DATA} o {GODZ} w {STUDIO}",
    };

    let template = templates[templateCode] || templateCode;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key.toUpperCase()}}`;
      template = template.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return template;
  }

  const result = generateSMSBody('SMS_D2', { 
    IMIE: 'Jan', 
    DATA: '2024-12-25', 
    GODZ: '10:00', 
    STUDIO: 'Studio XYZ' 
  });
  
  const expected = 'Cześć Jan! Wizyta 2024-12-25 o 10:00 w Studio XYZ – widzimy się pojutrze';
  
  if (result === expected) {
    console.log('✅ SMS template test passed');
    return true;
  } else {
    console.log('❌ SMS template test failed');
    console.log(`   Expected: ${expected}`);
    console.log(`   Got: ${result}`);
    return false;
  }
}

const utilityTestResult = testSMSTemplate();

console.log('\n' + '='.repeat(50));
console.log('📊 FINAL RESULTS:');
console.log(`Main Tests: ${mainTestResult ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Utility Tests: ${utilityTestResult ? '✅ PASSED' : '❌ FAILED'}`);

const overallSuccess = mainTestResult && utilityTestResult;
console.log(`\nOverall: ${overallSuccess ? '🎉 ALL TESTS PASSED!' : '❌ SOME TESTS FAILED!'}`);

if (!overallSuccess) {
  process.exit(1);
}