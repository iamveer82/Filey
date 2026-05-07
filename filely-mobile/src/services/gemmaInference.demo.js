/**
 * Mock Gemma Inference Service for Expo Go Demo
 * Simulates AI receipt parsing
 */

import DemoConfig from '../lib/demoMode';

// Mock parsed receipt data
const MOCK_PARSED_RECEIPTS = [
  {
    merchant: 'Carrefour UAE',
    date: '2025-04-21',
    amount: 125.50,
    vat: 6.25,
    trn: '123456789012345',
    currency: 'AED',
    category: 'Food & Dining',
    paymentMethod: 'Credit Card',
  },
  {
    merchant: 'LuLu Hypermarket',
    date: '2025-04-20',
    amount: 89.99,
    vat: 4.50,
    trn: '',
    currency: 'AED',
    category: 'Shopping',
    paymentMethod: 'Cash',
  },
  {
    merchant: 'ENOC',
    date: '2025-04-19',
    amount: 150.00,
    vat: 7.50,
    trn: '987654321098765',
    currency: 'AED',
    category: 'Transportation',
    paymentMethod: 'Credit Card',
  },
  {
    merchant: 'Talabat',
    date: '2025-04-18',
    amount: 45.00,
    vat: 2.25,
    trn: '',
    currency: 'AED',
    category: 'Food & Dining',
    paymentMethod: 'Mobile Payment',
  },
  {
    merchant: 'Amazon.ae',
    date: '2025-04-17',
    amount: 299.00,
    vat: 14.95,
    trn: '555666777888999',
    currency: 'AED',
    category: 'Shopping',
    paymentMethod: 'Debit Card',
  },
];

export const parseReceipt = async (ocrText) => {
  await simulateDelay(DemoConfig.mockProcessingDelay / 2);

  // Randomly select a mock receipt
  const randomReceipt = MOCK_PARSED_RECEIPTS[Math.floor(Math.random() * MOCK_PARSED_RECEIPTS.length)];

  return {
    ...randomReceipt,
    confidence: 0.92,
  };
};

export const isModelReady = async () => {
  return true;
};

const simulateDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
  parseReceipt,
  isModelReady,
};
