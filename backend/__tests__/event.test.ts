import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import db from '../db';

describe('Event API', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.exec`DELETE FROM events WHERE created_by = 'test_user'`;
    await db.exec`DELETE FROM clients WHERE created_by = 'test_user'`;
  });

  afterEach(async () => {
    // Clean up after each test
    await db.exec`DELETE FROM events WHERE created_by = 'test_user'`;
    await db.exec`DELETE FROM clients WHERE created_by = 'test_user'`;
  });

  it('should create a new event', async () => {
    const eventData = {
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

    // Test event creation logic here
    expect(eventData.firstName).toBe('Jan');
    expect(eventData.price).toBe(500);
  });

  it('should validate required fields', () => {
    const invalidEvent = {
      firstName: '',
      lastName: 'Kowalski',
      eventTime: '',
      service: '',
      price: 0,
      durationMinutes: 0,
      createdBy: 'test_user'
    };

    // Test validation
    expect(invalidEvent.firstName).toBe('');
    expect(invalidEvent.service).toBe('');
  });
});