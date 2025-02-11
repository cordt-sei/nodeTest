// src/config/requestPatterns.js

import { RequestQueueGenerator } from '../config/requestPatterns.js';

export const requestWeights = {
    // EVM Methods with relative weights based on pie chart
    methods: {
        'eth_getblockbynumber': 15,    // Significant golden section
        'eth_getlogs': 12,             // Large blue section
        'eth_subscribe': 11,           // Orange section
        'eth_call': 10,               // Red section
        'abci_query': 10,             // Light green section
        'sei_getlogs': 8,             // Purple section
        'eth_blocknumber': 7,         // Dark blue section
        'eth_gettransactionreceipt': 7, // Green section
        'debug_traceblockbynumber': 6,  // Yellow section
        'eth_getbalance': 5,          // Light blue section
        'other': 9                    // Remaining misc methods
    },

    // Request pattern generator
    generateRequestSequence(totalRequests) {
        const sequence = [];
        const methods = Object.entries(this.methods);
        const totalWeight = methods.reduce((sum, [_, weight]) => sum + weight, 0);

        for (let i = 0; i < totalRequests; i++) {
            let random = Math.random() * totalWeight;
            for (const [method, weight] of methods) {
                if (random < weight) {
                    sequence.push(method);
                    break;
                }
                random -= weight;
            }
        }

        return sequence;
    },

    // EVM request templates
    templates: {
        'eth_getblockbynumber': {
            method: 'POST',
            createParams: (blockNumber = 'latest') => ({
                jsonrpc: '2.0',
                method: 'eth_getBlockByNumber',
                params: [blockNumber, true],
                id: Date.now()
            })
        },
        'eth_getlogs': {
            method: 'POST',
            createParams: (fromBlock, toBlock) => ({
                jsonrpc: '2.0',
                method: 'eth_getLogs',
                params: [{
                    fromBlock: fromBlock || 'latest',
                    toBlock: toBlock || 'latest'
                }],
                id: Date.now()
            })
        },
        'eth_subscribe': {
            method: 'POST',
            createParams: (type = 'newHeads') => ({
                jsonrpc: '2.0',
                method: 'eth_subscribe',
                params: [type],
                id: Date.now()
            })
        },
        'eth_call': {
            method: 'POST',
            createParams: (txObject, blockNumber = 'latest') => ({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [txObject, blockNumber],
                id: Date.now()
            })
        },
        'abci_query': {
            method: 'GET',
            createParams: (path, data) => ({
                path,
                data,
                height: '0',
                prove: false
            })
        },
        'sei_getlogs': {
            method: 'GET',
            createParams: (params) => ({
                ...params
            })
        },
        'eth_blocknumber': {
            method: 'POST',
            createParams: () => ({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: Date.now()
            })
        },
        'eth_gettransactionreceipt': {
            method: 'POST',
            createParams: (txHash) => ({
                jsonrpc: '2.0',
                method: 'eth_getTransactionReceipt',
                params: [txHash],
                id: Date.now()
            })
        },
        'debug_traceblockbynumber': {
            method: 'POST',
            createParams: (blockNumber, options = {}) => ({
                jsonrpc: '2.0',
                method: 'debug_traceBlockByNumber',
                params: [
                    blockNumber,
                    options
                ],
                id: Date.now()
            })
        },
        'eth_getbalance': {
            method: 'POST',
            createParams: (address, blockNumber = 'latest') => ({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [address, blockNumber],
                id: Date.now()
            })
        }
    }
};

// Request queue generator with realistic distribution
export class RequestQueueGenerator {
    constructor(config = {}) {
        this.config = {
            batchSize: 100,
            ...config
        };
        this.patterns = requestWeights;
    }

    generateBatch() {
        const sequence = this.patterns.generateRequestSequence(this.config.batchSize);
        return sequence.map(method => {
            const template = this.patterns.templates[method];
            if (!template) return null;

            return {
                method: template.method,
                type: method,
                params: template.createParams()
            };
        }).filter(Boolean);
    }

    async *generateQueue() {
        while (true) {
            const batch = this.generateBatch();
            for (const request of batch) {
                yield request;
            }
            // Optional delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}
