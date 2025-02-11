import { CoreTester } from '../../core/tester.js';
import { RequestQueueGenerator } from '../../config/requestPatterns.js';
import { MetricCollector } from '../../analyzers/metricCollector.js';
import { ResponseAnalyzer } from '../../analyzers/responseAnalyzer.js';

export class LoadTester extends CoreTester {
    constructor(config) {
        super({
            ...config,
            mode: 'load'
        });

        this.queueGenerator = new RequestQueueGenerator();
        this.metricCollector = new MetricCollector();
        this.responseAnalyzer = new ResponseAnalyzer();
        
        this.runningWorkers = new Set();
        this.requestQueue = [];
    }

    async start() {
        this.logger.info('Starting load test', this.config);
        
        try {
            await this.warmup();
            await this.runLoadTest();
            await this.cooldown();
        } catch (error) {
            this.logger.error('Load test failed', error);
            throw error;
        } finally {
            await this.generateReport();
        }
    }

    async warmup() {
        this.logger.info('Warming up...');
        const warmupRequests = this.queueGenerator.generateBatch(10);
        
        for (const request of warmupRequests) {
            try {
                await this.makeRequest(request);
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                this.logger.warn('Warmup request failed', { request, error });
            }
        }
    }

    async runLoadTest() {
        this.logger.info('Starting main load test phase');
        
        const queue = this.queueGenerator.generateQueue();
        const workers = [];

        for (let i = 0; i < this.config.concurrency; i++) {
            workers.push(this.startWorker(queue));
        }

        await Promise.all(workers);
    }

    async startWorker(queue) {
        const workerId = Math.random().toString(36).substr(2, 9);
        this.runningWorkers.add(workerId);

        try {
            for await (const request of queue) {
                if (!this.runningWorkers.has(workerId)) break;

                const startTime = Date.now();
                try {
                    const response = await this.makeRequest(request);
                    
                    // Record metrics
                    this.metricCollector.recordRequest(request.type, {
                        duration: Date.now() - startTime,
                        success: true
                    });

                    // Analyze response
                    const anomalies = this.responseAnalyzer.analyze(response, {
                        workerId,
                        request: request.type
                    });

                    if (anomalies.length > 0) {
                        this.logger.warn('Response anomalies detected', { anomalies });
                    }

                } catch (error) {
                    this.metricCollector.recordRequest(request.type, {
                        duration: Date.now() - startTime,
                        success: false,
                        error: error.message,
                        rateLimited: error.response?.status === 429
                    });

                    this.logger.error('Request failed', {
                        workerId,
                        request: request.type,
                        error
                    });
                }

                // Take periodic snapshots
                if (Math.random() < 0.01) { // 1% chance
                    const snapshot = this.metricCollector.takeSnapshot();
                    this.logger.info('Metrics snapshot', snapshot);
                }

                // Rate limiting check
                if (this.metricCollector.getRecentRateLimitHits() > 10) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        } finally {
            this.runningWorkers.delete(workerId);
        }
    }

    async cooldown() {
        this.logger.info('Cooling down...');
        // Stop all workers
        this.runningWorkers.clear();
    await new Promise(resolve => setTimeout(resolve, 1000));
}

async generateReport() {
    const metrics = await this.metricCollector.saveMetrics();
    const analysis = this.responseAnalyzer.generateReport();
    
    return {
        metrics,
        analysis,
        configuration: this.config
    };
}

// Mixed RPC method handlers
async makeRpcRequest(method, params = []) {
    const request = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params
        })
    };

    return this.makeRequest(this.config.endpoint, request);
}

async makeCosmosRequest(path, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.config.endpoint}${path}${queryString ? '?' + queryString : ''}`;

    return this.makeRequest(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${this.config.authToken}`
        }
    });
}

// Updated request templates
templates = {
    'eth_getblockreceipts': {
        type: 'evm',
        handler: async (blockNumber = 'latest') => {
            return this.makeRpcRequest('eth_getBlockReceipts', [blockNumber]);
        }
    },
    'sei_getblockbynumber': {
        type: 'cosmos',
        handler: async (height) => {
            return this.makeCosmosRequest(`/cosmos/base/tendermint/v1beta1/blocks/${height}`);
        }
    },
    'block': {
        type: 'cosmos',
        handler: async (height = 'latest') => {
            return this.makeCosmosRequest('/blocks/' + height);
        }
    },
    'eth_gettransactionreceipt': {
        type: 'evm',
        handler: async (txHash) => {
            return this.makeRpcRequest('eth_getTransactionReceipt', [txHash]);
        }
    },
    'debug_traceblockbyhash': {
        type: 'evm',
        handler: async (blockHash, options = {}) => {
            return this.makeRpcRequest('debug_traceBlockByHash', [blockHash, options]);
        }
    },
    'tx_search': {
        type: 'cosmos',
        handler: async (query, page = 1, per_page = 30) => {
            return this.makeCosmosRequest('/tx_search', { query, page, per_page });
        }
    },
    'block_results': {
        type: 'cosmos',
        handler: async (height) => {
            return this.makeCosmosRequest('/block_results', { height });
        }
    },
    'eth_gettransactioncount': {
        type: 'evm',
        handler: async (address, blockParam = 'latest') => {
            return this.makeRpcRequest('eth_getTransactionCount', [address, blockParam]);
        }
    },
    'sei_getseiaddress': {
        type: 'cosmos',
        handler: async (address) => {
            return this.makeCosmosRequest('/cosmos/auth/v1beta1/accounts/' + address);
        }
    },
    '/cosmos/tx/v1beta1/txs': {
        type: 'cosmos',
        handler: async (hash) => {
            return this.makeCosmosRequest(`/cosmos/tx/v1beta1/txs/${hash}`);
        }
    }
};

// Request weight distribution based on pie chart
weights = {
    'other': 30,
    'eth_getblockreceipts': 12,
    'sei_getblockbynumber': 10,
    'block': 9,
    'eth_gettransactionreceipt': 8,
    'debug_traceblockbyhash': 7,
    'tx_search': 6,
    'block_results': 5,
    'eth_gettransactioncount': 5,
    'sei_getseiaddress': 4,
    '/cosmos/tx/v1beta1/txs': 4
};

generateWeightedRequest() {
    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    
    for (const [method, weight] of Object.entries(this.weights)) {
        random -= weight;
        if (random <= 0) {
            return method;
        }
    }
    return 'other';
}

async executeRequest(method, customParams = {}) {
    const template = this.templates[method];
    if (!template) {
        throw new Error(`Unsupported method: ${method}`);
    }

    try {
        const response = await template.handler.call(this, customParams);
        this.metricCollector.recordRequest(method, {
            duration: Date.now() - startTime,
            success: true,
            type: template.type
        });
        return response;
    } catch (error) {
        this.handleRequestError(method, error, template.type);
        throw error;
    }
}

handleRequestError(method, error, type) {
    this.logger.error('Request failed', {
        method,
        type,
        error: error.message,
        status: error.response?.status
    });

    // Special handling for rate limits
    if (error.response?.status === 429) {
        this.metricCollector.recordRateLimit(type);
    }
}
}

export default LoadTester;