// Utility function tests for CRM application

// Test SMS template rendering
export function testSMSTemplates() {
  console.log('Testing SMS template rendering...');
  
  function generateSMSBody(templateCode: string, variables: Record<string, string>): string {
    const templates: Record<string, string> = {
      'SMS_D2': "Cześć {IMIE}! Wizyta {DATA} o {GODZ} w {STUDIO} – widzimy się pojutrze",
      'SMS_D1': "Hej {IMIE}! Jutro {DATA} o {GODZ} w {STUDIO}",
      'SMS_D0': "To dziś, {IMIE}! {GODZ} w {STUDIO}",
    };

    let template = templates[templateCode] || templateCode;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key.toUpperCase()}}`;
      template = template.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return template;
  }

  const testCases = [
    {
      template: 'SMS_D2',
      variables: { IMIE: 'Jan', DATA: '2024-12-25', GODZ: '10:00', STUDIO: 'Studio XYZ' },
      expected: 'Cześć Jan! Wizyta 2024-12-25 o 10:00 w Studio XYZ – widzimy się pojutrze'
    },
    {
      template: 'SMS_D1',
      variables: { IMIE: 'Anna', DATA: '2024-12-24', GODZ: '14:30', STUDIO: 'Studio XYZ' },
      expected: 'Hej Anna! Jutro 2024-12-24 o 14:30 w Studio XYZ'
    }
  ];

  let allPassed = true;
  for (const testCase of testCases) {
    const result = generateSMSBody(testCase.template, testCase.variables);
    if (result === testCase.expected) {
      console.log(`✅ SMS template test passed: ${testCase.template}`);
    } else {
      console.log(`❌ SMS template test failed: ${testCase.template}`);
      console.log(`   Expected: ${testCase.expected}`);
      console.log(`   Got: ${result}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Test event validation logic
export function testEventValidation() {
  console.log('Testing event validation logic...');
  
  function validateEvent(event: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!event.firstName || event.firstName.trim() === '') {
      errors.push('First name is required');
    }
    
    if (!event.lastName || event.lastName.trim() === '') {
      errors.push('Last name is required');
    }
    
    if (!event.service || event.service.trim() === '') {
      errors.push('Service is required');
    }
    
    if (!event.price || event.price <= 0) {
      errors.push('Price must be greater than 0');
    }
    
    if (!event.durationMinutes || event.durationMinutes <= 0) {
      errors.push('Duration must be greater than 0');
    }
    
    if (!event.eventTime) {
      errors.push('Event time is required');
    }
    
    return { valid: errors.length === 0, errors };
  }

  const testCases = [
    {
      name: 'Valid event',
      event: {
        firstName: 'Jan',
        lastName: 'Kowalski',
        service: 'Tatuaż',
        price: 500,
        durationMinutes: 120,
        eventTime: '2024-12-25T10:00:00Z'
      },
      shouldBeValid: true
    },
    {
      name: 'Missing required fields',
      event: {
        firstName: '',
        lastName: '',
        service: '',
        price: 0,
        durationMinutes: 0,
        eventTime: ''
      },
      shouldBeValid: false
    }
  ];

  let allPassed = true;
  for (const testCase of testCases) {
    const result = validateEvent(testCase.event);
    if (result.valid === testCase.shouldBeValid) {
      console.log(`✅ Event validation test passed: ${testCase.name}`);
    } else {
      console.log(`❌ Event validation test failed: ${testCase.name}`);
      console.log(`   Expected valid: ${testCase.shouldBeValid}, got: ${result.valid}`);
      console.log(`   Errors: ${result.errors.join(', ')}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Test price calculation
export function testPriceCalculation() {
  console.log('Testing price calculation...');
  
  function calculateTotalPrice(basePrice: number, depositAmount?: number): { total: number; remaining: number } {
    const total = basePrice;
    const deposit = depositAmount || 0;
    const remaining = Math.max(0, total - deposit);
    
    return { total, remaining };
  }

  const testCases = [
    { basePrice: 500, depositAmount: 100, expectedTotal: 500, expectedRemaining: 400 },
    { basePrice: 300, depositAmount: undefined, expectedTotal: 300, expectedRemaining: 300 },
    { basePrice: 200, depositAmount: 250, expectedTotal: 200, expectedRemaining: 0 }
  ];

  let allPassed = true;
  for (const testCase of testCases) {
    const result = calculateTotalPrice(testCase.basePrice, testCase.depositAmount);
    if (result.total === testCase.expectedTotal && result.remaining === testCase.expectedRemaining) {
      console.log(`✅ Price calculation test passed: ${testCase.basePrice} - ${testCase.depositAmount || 0}`);
    } else {
      console.log(`❌ Price calculation test failed`);
      console.log(`   Expected: total=${testCase.expectedTotal}, remaining=${testCase.expectedRemaining}`);
      console.log(`   Got: total=${result.total}, remaining=${result.remaining}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

export function runUtilityTests() {
  console.log('🔧 Running Utility Tests...\n');
  
  const results = [];
  
  results.push(testSMSTemplates());
  console.log('');
  
  results.push(testEventValidation());
  console.log('');
  
  results.push(testPriceCalculation());
  console.log('');
  
  const allPassed = results.every(result => result === true);
  
  if (allPassed) {
    console.log('🎉 All utility tests passed!');
  } else {
    console.log('❌ Some utility tests failed!');
  }
  
  return allPassed;
}