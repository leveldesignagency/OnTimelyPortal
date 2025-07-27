export interface Currency {
  code: string;
  name: string;
  flag: string;
}

const CURRENCY_LIST: Currency[] = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
];

export function getCurrencyList(): Currency[] {
  return CURRENCY_LIST;
}

// Cache for API rates to avoid repeated calls
const rateCache: { [key: string]: { rate: number; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ExchangeRate-API key
const EXCHANGE_RATE_API_KEY = '66809581aeadffd7e11120a3';

// Comprehensive mock rates for fallback
const MOCK_RATES: { [from: string]: { [to: string]: number } } = {
  USD: { 
    EUR: 0.92, GBP: 0.78, JPY: 157, AUD: 1.5, CAD: 1.36, CHF: 0.89, 
    CNY: 7.2, INR: 83, BRL: 5.4, ZAR: 18 
  },
  EUR: { 
    USD: 1.09, GBP: 0.85, JPY: 170, AUD: 1.63, CAD: 1.48, CHF: 0.97, 
    CNY: 7.8, INR: 90, BRL: 5.9, ZAR: 19.5 
  },
  GBP: { 
    USD: 1.28, EUR: 1.17, JPY: 200, AUD: 1.92, CAD: 1.74, CHF: 1.14, 
    CNY: 9.2, INR: 105, BRL: 6.9, ZAR: 23 
  },
  JPY: { 
    USD: 0.0064, EUR: 0.0059, GBP: 0.005, AUD: 0.0096, CAD: 0.0087, 
    CHF: 0.0057, CNY: 0.046, INR: 0.53, BRL: 0.034, ZAR: 0.115 
  },
  AUD: { 
    USD: 0.67, EUR: 0.61, GBP: 0.52, JPY: 104, CAD: 0.91, CHF: 0.59, 
    CNY: 4.8, INR: 55, BRL: 3.6, ZAR: 12 
  },
  CAD: { 
    USD: 0.74, EUR: 0.68, GBP: 0.57, JPY: 115, AUD: 1.1, CHF: 0.65, 
    CNY: 5.3, INR: 61, BRL: 4, ZAR: 13.2 
  },
  CHF: { 
    USD: 1.12, EUR: 1.03, GBP: 0.88, JPY: 176, AUD: 1.69, CAD: 1.54, 
    CNY: 8.1, INR: 93, BRL: 6.1, ZAR: 20.2 
  },
  CNY: { 
    USD: 0.14, EUR: 0.13, GBP: 0.11, JPY: 21.8, AUD: 0.21, CAD: 0.19, 
    CHF: 0.12, INR: 11.5, BRL: 0.75, ZAR: 2.5 
  },
  INR: { 
    USD: 0.012, EUR: 0.011, GBP: 0.0095, JPY: 1.89, AUD: 0.018, CAD: 0.016, 
    CHF: 0.011, CNY: 0.087, BRL: 0.065, ZAR: 0.22 
  },
  BRL: { 
    USD: 0.19, EUR: 0.17, GBP: 0.14, JPY: 29, AUD: 0.28, CAD: 0.25, 
    CHF: 0.16, CNY: 1.33, INR: 15.4, ZAR: 3.33 
  },
  ZAR: { 
    USD: 0.056, EUR: 0.051, GBP: 0.043, JPY: 8.7, AUD: 0.083, CAD: 0.076, 
    CHF: 0.049, CNY: 0.4, INR: 4.6, BRL: 0.3 
  }
};

// Get cached rate or return null if expired
function getCachedRate(from: string, to: string): number | null {
  const key = `${from}_${to}`;
  const cached = rateCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rate;
  }
  return null;
}

// Cache a rate
function cacheRate(from: string, to: string, rate: number) {
  const key = `${from}_${to}`;
  rateCache[key] = { rate, timestamp: Date.now() };
}

export async function convertCurrency(amount: number, from: string, to: string): Promise<string> {
  if (from === to) return amount.toFixed(2);
  
  // Check cache first
  const cachedRate = getCachedRate(from, to);
  if (cachedRate) {
    return (amount * cachedRate).toFixed(2);
  }

  try {
    // Use ExchangeRate-API with your API key for reliable real-time rates
    const apiUrl = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/${from}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.conversion_rates && data.conversion_rates[to]) {
      const rate = data.conversion_rates[to];
      // Cache the successful rate
      cacheRate(from, to, rate);
      return (amount * rate).toFixed(2);
    } else {
      throw new Error('Rate not found in API response');
    }

  } catch (error) {
    console.log('ExchangeRate-API failed, using mock rates:', error);
    
    // Fallback to mock rates
    const mockRate = MOCK_RATES[from]?.[to];
    if (mockRate) {
      // Cache the mock rate too
      cacheRate(from, to, mockRate);
      return (amount * mockRate).toFixed(2);
    }
    
    return 'N/A';
  }
} 