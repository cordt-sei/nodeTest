export { requestWeights } from './requestPatterns.js';
export { testCases } from './testCases.js';

export const config = {
    endpoint: process.env.SEI_RPC_ENDPOINT || 'https://archive.sei.hellomoon.io',
    authToken: process.env.SEI_AUTH_TOKEN,
    logLevel: process.env.LOG_LEVEL || 'info',
    concurrency: parseInt(process.env.TEST_CONCURRENCY, 10) || 5,
    maxRequestsPerSecond: parseInt(process.env.MAX_REQUESTS_PER_SECOND, 10) || 10
};