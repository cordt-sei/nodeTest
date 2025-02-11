import axios from 'axios';
import { EventEmitter } from 'events';

class ChainLoadTester extends EventEmitter {
    constructor(config) {
        super();
        this.config = {
            baseEndpoint: '',
            headers: {},
            initialConcurrency: 5,
            ...config
        };

        // Store discovered data for test construction
        this.chainData = {
            latestHeight: null,
            blocks: new Map(),
            accounts: new Set(),
            contracts: new Set(),
            tokens: new Set(),
            transactions: new Set(),
            evm: {
                accounts: new Set(),
                contracts: new Set(),
                tokens: new Set()
            }
        };

        // Define test stages
        this.stages = [
            { name: 'chain-info', weight: 1 },
            { name: 'block-queries', weight: 2 },
            { name: 'account-queries', weight: 3 },
            { name: 'token-queries', weight: 3 },
            { name: 'contract-queries', weight: 4 },
            { name: 'complex-queries', weight: 5 }
        ];

        this.metrics = {
            requestsByType: {},
            latenciesByType: {},
            errorsByType: {},
            discovered: {
                blocks: 0,
                accounts: 0,
                contracts: 0,
                tokens: 0,
                transactions: 0
            }
        };
    }

    async start() {
        console.log('\nStarting Progressive Chain Load Test');
        console.log('==================================');

        try {
            // Stage 1: Initial Chain Discovery
            await this.performInitialDiscovery();

            // Stage 2: Block Analysis
            await this.analyzeBlocks();

            // Stage 3: Transaction Analysis
            await this.analyzeTransactions();

            // Stage 4: Contract Discovery
            await this.discoverContracts();

            // Stage 5: Progressive Load Testing
            await this.runProgressiveLoadTests();

        } catch (error) {
            console.error('Test suite failed:', error);
        }
    }

    async performInitialDiscovery() {
        console.log('\n📊 Stage 1: Initial Chain Discovery');
        
        // Basic chain info queries
        const queries = [
            { 
                name: 'latest-block',
                endpoint: '/cosmos/base/tendermint/v1beta1/blocks/latest',
                handler: this.handleLatestBlock.bind(this)
            },
            {
                name: 'chain-id',
                endpoint: '/cosmos/base/tendermint/v1beta1/node_info',
                handler: this.handleChainInfo.bind(this)
            },
            {
                name: 'evm-latest',
                endpoint: '/',
                method: 'POST',
                data: {
                    jsonrpc: '2.0',
                    method: 'eth_blockNumber',
                    params: [],
                    id: 1
                },
                handler: this.handleEvmLatest.bind(this)
            }
        ];

        for (const query of queries) {
            try {
                const response = await this.makeRequest(query);
                await query.handler(response.data);
            } catch (error) {
                console.error(`Failed ${query.name}:`, error.message);
            }
        }
    }

    async analyzeBlocks() {
        console.log('\n📦 Stage 2: Block Analysis');
        
        const blockRange = 10; // Number of recent blocks to analyze
        const startBlock = this.chainData.latestHeight;
        const promises = [];

        for (let height = startBlock; height > startBlock - blockRange; height--) {
            promises.push(this.fetchBlockData(height));
        }

        await Promise.all(promises);
        console.log(`Analyzed ${blockRange} blocks`);
    }

    async analyzeTransactions() {
        console.log('\n💸 Stage 3: Transaction Analysis');
        
        for (const [height, block] of this.chainData.blocks) {
            if (block.txs && block.txs.length > 0) {
                for (const tx of block.txs) {
                    await this.analyzeTx(tx);
                }
            }
        }
    }

    async discoverContracts() {
        console.log('\n📜 Stage 4: Contract Discovery');
        
        // Query both Cosmos and EVM contracts
        const queries = [
            {
                name: 'wasm-contracts',
                endpoint: '/cosmwasm/wasm/v1/contracts',
                handler: this.handleWasmContracts.bind(this)
            },
            {
                name: 'evm-contracts',
                endpoint: '/',
                method: 'POST',
                data: {
                    jsonrpc: '2.0',
                    method: 'eth_getCode',
                    params: Array.from(this.chainData.evm.accounts).map(addr => [addr, 'latest']),
                    id: 1
                },
                handler: this.handleEvmContracts.bind(this)
            }
        ];

        for (const query of queries) {
            try {
                const response = await this.makeRequest(query);
                await query.handler(response.data);
            } catch (error) {
                console.error(`Failed ${query.name}:`, error.message);
            }
        }
    }

    async runProgressiveLoadTests() {
        console.log('\n🔨 Stage 5: Progressive Load Testing');
        
        // Generate test scenarios using discovered data
        const scenarios = this.generateTestScenarios();
        
        // Run scenarios with increasing concurrency
        for (const scenario of scenarios) {
            console.log(`\nExecuting ${scenario.name} scenario`);
            await this.runScenario(scenario);
        }
    }

    generateTestScenarios() {
        return [
            // Basic Queries
            {
                name: 'basic-chain-queries',
                weight: 1,
                queries: [
                    { 
                        endpoint: '/cosmos/base/tendermint/v1beta1/blocks/latest',
                        method: 'GET'
                    },
                    {
                        endpoint: '/',
                        method: 'POST',
                        data: {
                            jsonrpc: '2.0',
                            method: 'eth_blockNumber',
                            params: [],
                            id: 1
                        }
                    }
                ]
            },
            // Block Queries
            {
                name: 'block-queries',
                weight: 2,
                queries: Array.from(this.chainData.blocks.keys()).map(height => ({
                    endpoint: `/cosmos/base/tendermint/v1beta1/blocks/${height}`,
                    method: 'GET'
                }))
            },
            // Account Queries
            {
                name: 'account-queries',
                weight: 3,
                queries: Array.from(this.chainData.accounts).map(addr => ({
                    endpoint: `/cosmos/auth/v1beta1/accounts/${addr}`,
                    method: 'GET'
                }))
            },
            // Token Queries
            {
                name: 'token-queries',
                weight: 3,
                queries: Array.from(this.chainData.tokens).map(token => ({
                    endpoint: `/cosmos/bank/v1beta1/balances/${token}`,
                    method: 'GET'
                }))
            },
            // Contract Queries
            {
                name: 'contract-queries',
                weight: 4,
                queries: Array.from(this.chainData.contracts).map(contract => ({
                    endpoint: `/cosmwasm/wasm/v1/contract/${contract}/state`,
                    method: 'GET'
                }))
            },
            // Complex Mixed Queries
            {
                name: 'complex-mixed',
                weight: 5,
                queries: this.generateComplexQueries()
            }
        ];
    }

    generateComplexQueries() {
        const queries = [];
        
        // Add complex Cosmos SDK queries
        if (this.chainData.contracts.size > 0) {
            const contracts = Array.from(this.chainData.contracts);
            queries.push({
                endpoint: '/cosmwasm/wasm/v1/contracts',
                method: 'GET',
                params: {
                    pagination: {
                        limit: '50'
                    }
                }
            });

            // Contract state queries
            contracts.forEach(contract => {
                queries.push({
                    endpoint: `/cosmwasm/wasm/v1/contract/${contract}/state`,
                    method: 'GET'
                });
            });
        }

        // Add complex EVM queries
        if (this.chainData.evm.accounts.size > 0) {
            const accounts = Array.from(this.chainData.evm.accounts);
            accounts.forEach(account => {
                queries.push({
                    endpoint: '/',
                    method: 'POST',
                    data: {
                        jsonrpc: '2.0',
                        method: 'eth_getBalance',
                        params: [account, 'latest'],
                        id: 1
                    }
                });
            });
        }

        return queries;
    }

    async runScenario(scenario) {
        const concurrency = Math.ceil(this.config.initialConcurrency * scenario.weight);
        console.log(`Running with concurrency: ${concurrency}`);

        const batchSize = Math.min(scenario.queries.length, concurrency);
        const batches = this.chunkArray(scenario.queries, batchSize);

        for (const batch of batches) {
            const promises = batch.map(query => this.makeRequest(query));
            await Promise.all(promises);
        }
    }

    async makeRequest(query) {
        const startTime = Date.now();
        try {
            const response = await axios({
                method: query.method || 'GET',
                url: this.config.baseEndpoint + query.endpoint,
                headers: this.config.headers,
                data: query.data,
                params: query.params
            });

            this.recordMetrics('success', query.endpoint, Date.now() - startTime);
            return response;
        } catch (error) {
            this.recordMetrics('error', query.endpoint, Date.now() - startTime);
            throw error;
        }
    }

    // Handlers for different response types
    async handleLatestBlock(data) {
        this.chainData.latestHeight = parseInt(data.block.header.height);
        console.log(`Latest block height: ${this.chainData.latestHeight}`);
    }

    async handleChainInfo(data) {
        console.log(`Chain ID: ${data.default_node_info.network}`);
    }

    async handleEvmLatest(data) {
        const blockNum = parseInt(data.result, 16);
        console.log(`Latest EVM block: ${blockNum}`);
    }

    async fetchBlockData(height) {
        try {
            const response = await this.makeRequest({
                endpoint: `/cosmos/base/tendermint/v1beta1/blocks/${height}`
            });
            
            this.chainData.blocks.set(height, response.data.block);
            
            // Extract accounts and transactions
            if (response.data.block.txs) {
                for (const tx of response.data.block.txs) {
                    await this.extractDataFromTx(tx);
                }
            }
        } catch (error) {
            console.error(`Failed to fetch block ${height}:`, error.message);
        }
    }

    async analyzeTx(tx) {
        try {
            const decodedTx = await this.decodeTx(tx);
            this.extractAddresses(decodedTx);
            this.extractTokens(decodedTx);
        } catch (error) {
            console.error('Failed to analyze transaction:', error.message);
        }
    }

    async decodeTx(tx) {
        // Implement transaction decoding logic here
        // This would handle both Cosmos SDK and EVM transactions
        return tx;
    }

    extractAddresses(tx) {
        // Implement address extraction logic
        // Add to this.chainData.accounts or this.chainData.evm.accounts
    }

    extractTokens(tx) {
        // Implement token extraction logic
        // Add to this.chainData.tokens
    }

    recordMetrics(type, endpoint, duration) {
        const key = `${type}-${endpoint}`;
        this.metrics.requestsByType[key] = (this.metrics.requestsByType[key] || 0) + 1;
        this.metrics.latenciesByType[key] = this.metrics.latenciesByType[key] || [];
        this.metrics.latenciesByType[key].push(duration);
    }

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}

// Example usage:
const tester = new ChainLoadTester({
    baseEndpoint: 'https://archive.sei.hellomoon.io',
    headers: {
        'Authorization': 'Bearer 2c28a5d8-f73b-4500-9c63-0c30a578a360'
    },
    initialConcurrency: 5
});

tester.start().catch(console.error);
