#!/usr/bin/env tsx

// Simple test runner for Encore.ts environment
import { runTests } from './__tests__/event.test.js';

console.log('🚀 Starting CRM Test Suite');
console.log('==========================\n');

try {
  runTests();
  console.log('\n✅ All tests completed successfully!');
} catch (error) {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
}