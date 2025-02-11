import { EventEmitter } from 'events';
import axios from 'axios';
import winston from 'winston';
import path from 'path';
import fs from 'fs/promises';

class CoreTester extends EventEmitter {
    constructor(config) {
        super();
        this.config = {
            mode: 'load', // or 'exhaustive'
            logLevel: 'info',
            responseLogging: true,
            metricsEnabled: true,
            ...config
        };

        this.setupLogger();
        this.setupMetrics();
        
        this.responses = {
            successful: new Map(),
            failed: new Map(),
            patterns: new Map()
        };
    }

    setupLogger() {
        this.logger = winston.createLogger({
            level: this.config.logLevel,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({
                    filename: path.join('logs', `${this.config.mode}-${Date.now()}.log`)
                }),
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
    }

    setupMetrics() {
        this.metrics = {
            startTime: null,
            endTime: null,
            requests: {
                total: 0,
                successful: 0,
                failed: 0
            },
            latencies: [],
            patterns: new Map(),
            rateLimit: {
                hits: 0,
                resets: []
            }
        };
    }

    async makeRequest(endpoint, options = {}) {
        const startTime = Date.now();
        
        try {
            const response = await axios({
                ...options,
                url: endpoint,
                headers: {
                    'Authorization': `Bearer ${this.config.authToken}`,
                    ...options.headers
                }
            });

            const latency = Date.now() - startTime;
            
            await this.handleSuccess(endpoint, response, latency);
            return response;

        } catch (error) {
            const latency = Date.now() - startTime;
            await this.handleError(endpoint, error, latency);
            throw error;
        }
    }

    async handleSuccess(endpoint, response, latency) {
        // Update metrics
        this.metrics.requests.total++;
        this.metrics.requests.successful++;
        this.metrics.latencies.push(latency);

        // Log response if enabled
        if (this.config.responseLogging) {
            await this.logResponse(endpoint, response, latency);
        }

        // Analyze response pattern
        await this.analyzeResponse(endpoint, response);

        // Store successful response
        if (!this.responses.successful.has(endpoint)) {
            this.responses.successful.set(endpoint, []);
        }
        this.responses.successful.get(endpoint).push({
            timestamp: Date.now(),
            latency,
            data: response.data
        });
    }

    async handleError(endpoint, error, latency) {
        // Update metrics
        this.metrics.requests.total++;
        this.metrics.requests.failed++;

        // Log error
        this.logger.error({
            endpoint,
            error: {
                message: error.message,
                code: error.code,
                response: error.response?.data
            },
            latency
        });

        // Store failed response
        if (!this.responses.failed.has(endpoint)) {
            this.responses.failed.set(endpoint, []);
        }
        this.responses.failed.get(endpoint).push({
            timestamp: Date.now(),
            latency,
            error: {
                message: error.message,
                code: error.code,
                response: error.response?.data
            }
        });
    }

    async analyzeResponse(endpoint, response) {
        try {
            // Extract response pattern
            const pattern = this.extractResponsePattern(response.data);
            
            // Update pattern metrics
            if (!this.metrics.patterns.has(pattern)) {
                this.metrics.patterns.set(pattern, 0);
            }
            this.metrics.patterns.set(
                pattern,
                this.metrics.patterns.get(pattern) + 1
            );

            // Store pattern with example
            if (!this.responses.patterns.has(pattern)) {
                this.responses.patterns.set(pattern, {
                    count: 0,
                    examples: []
                });
            }
            const patternData = this.responses.patterns.get(pattern);
            patternData.count++;
            if (patternData.examples.length < 5) {
                patternData.examples.push({
                    endpoint,
                    timestamp: Date.now(),
                    data: response.data
                });
            }

        } catch (error) {
            this.logger.warn('Response analysis failed:', error);
        }
    }

    extractResponsePattern(data) {
        // Create a structural pattern of the response
        const pattern = this.createStructuralPattern(data);
        return JSON.stringify(pattern);
    }

    createStructuralPattern(data, depth = 0) {
        if (depth > 3) return 'MAX_DEPTH';
        
        if (Array.isArray(data)) {
            if (data.length === 0) return 'EMPTY_ARRAY';
            return [this.createStructuralPattern(data[0], depth + 1)];
        }
        
        if (data === null) return 'NULL';
        
        switch (typeof data) {
            case 'object':
                return Object.keys(data).reduce((acc, key) => {
                    acc[key] = this.createStructuralPattern(data[key], depth + 1);
                    return acc;
                }, {});
            case 'string': return 'STRING';
            case 'number': return 'NUMBER';
            case 'boolean': return 'BOOLEAN';
            default: return typeof data;
        }
    }

    async logResponse(endpoint, response, latency) {
        const logData = {
            timestamp: new Date().toISOString(),
            endpoint,
            method: response.config.method,
            status: response.status,
            latency,
            headers: response.headers,
            data: response.data
        };

        await fs.appendFile(
            path.join('logs', `responses-${Date.now()}.json`),
            JSON.stringify(logData) + '\n'
        );
    }

    async generateReport() {
        const report = {
            mode: this.config.mode,
            duration: this.metrics.endTime - this.metrics.startTime,
            requests: this.metrics.requests,
            averageLatency: this.calculateAverageLatency(),
            patterns: Object.fromEntries(this.metrics.patterns),
            errorRate: this.calculateErrorRate(),
            endpoints: this.summarizeEndpoints()
        };

        await fs.writeFile(
            path.join('reports', `report-${Date.now()}.json`),
            JSON.stringify(report, null, 2)
        );

        return report;
    }

    calculateAverageLatency() {
        if (this.metrics.latencies.length === 0) return 0;
        return this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length;
    }

    calculate
