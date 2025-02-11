export const CONSTANTS = {
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  BACKOFF_MS: 1000,
  MAX_BATCH_SIZE: 100,
  RATE_LIMIT_WINDOW_MS: 60000,
  LOG_ROTATION_SIZE: 10485760, // 10MB
  METHODS: {
      EVM: ['eth_getblockreceipts', 'eth_gettransactionreceipt', 'eth_gettransactioncount'],
      COSMOS: ['sei_getblockbynumber', 'block', 'tx_search', 'block_results']
  },
  STATUS_CODES: {
      RATE_LIMIT: 429,
      SUCCESS: 200
  }
};