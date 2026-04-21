/**
 * Mock Vision OCR Service for Expo Go Demo
 * Simulates text recognition from images
 */

import DemoConfig from '../lib/demoMode';

// Sample receipt texts for demo
const MOCK_RECEIPTS = [
  {
    text: `CARREFOUR
Date: 21/04/2025
TRN: 123456789012345
Total: AED 125.50
VAT: AED 6.25
Payment: Credit Card`,
    merchant: 'Carrefour UAE',
    amount: 125.50,
    vat: 6.25,
    trn: '123456789012345',
    date: '2025-04-21',
    currency: 'AED',
    category: 'Food & Dining',
    paymentMethod: 'Credit Card',
  },
  {
    text: `LuLu Hypermarket
Date: 20/04/2025
Total: AED 89.99
VAT: AED 4.50
Cash Payment`,
    merchant: 'LuLu Hypermarket',
    amount: 89.99,
    vat: 4.50,
    trn: '',
    date: '2025-04-20',
    currency: 'AED',
    category: 'Shopping',
    paymentMethod: 'Cash',
  },
  {
    text: `ENOC Station
Fuel: AED 150.00
VAT: AED 7.50
Date: 19/04/2025
TRN: 987654321098765`,
    merchant: 'ENOC',
    amount: 150.00,
    vat: 7.50,
    trn: '987654321098765',
    date: '2025-04-19',
    currency: 'AED',
    category: 'Transportation',
    paymentMethod: 'Credit Card',
  },
];

export const recognizeText = async (imageUri) => {
  await simulateDelay(DemoConfig.mockProcessingDelay);

  // Randomly select a mock receipt
  const randomReceipt = MOCK_RECEIPTS[Math.floor(Math.random() * MOCK_RECEIPTS.length)];

  return {
    text: randomReceipt.text,
    blocks: [
      { text: randomReceipt.text, confidence: 0.95 }
    ],
    confidence: 0.95,
  };
};

export const isAvailable = async () => {
  return true;
};

const simulateDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
  recognizeText,
  isAvailable,
};
