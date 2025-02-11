import fs from 'fs/promises';
import path from 'path';

export class MetricCollector {
    constructor() {
        this.metrics = {
            requestCounts: new Map(),
            latencies: new Map(),
            errors: new Map(),
            timestamps: new Map(),
            rateLimit: {
                hits: 0,
                timestamps: []
            }
        };
        
        this.snapshots = [];
        this.startTime = Date.now();
    }

    recordRequest(endpoint, data) {
        const { duration, success, error, rateLimited } = data;
        
        // Update request counts
        this.incrementMapValue(this.metrics.requestCounts, endpoint);
        
        // Record latency
        if (!this.metrics.latencies.has(endpoint)) {
            this.metrics.latencies.set(endpoint, []);
        }
        this.metrics.latencies.get(endpoint).push(duration);
        
        // Record timestamp
        if (!this.metrics.timestamps.has(endpoint)) {
            this.metrics.timestamps.set(endpoint, []);
        }
        this.metrics.timestamps.get(endpoint).push(Date.now());
        
        // Record errors
        if (!success) {
            this.incrementMapValue(this.metrics.errors, endpoint);
        }
        
        // Track rate limiting
        if (rateLimited) {
            this.metrics.rateLimit.hits++;
            this.metrics.rateLimit.timestamps.push(Date.now());
        }
    }

    incrementMapValue(map, key) {
        map.set(key, (map.get(key) || 0) + 1);
    }

    takeSnapshot() {
        const snapshot = {
            timestamp: Date.now(),
            metrics: {
                requestCounts: Object.fromEntries(this.metrics.requestCounts),
                errorRates: this.calculateErrorRates(),
                averageLatencies: this.calculateAverageLatencies(),
                rateLimit: {
                    total: this.metrics.rateLimit.hits,
                    recentHits: this.getRecentRateLimitHits()
                }
            }
        };
        
        this.snapshots.push(snapshot);
        return snapshot;
    }

    calculateErrorRates() {
        const errorRates = {};
        for (const [endpoint, count] of this.metrics.requestCounts) {
            const errors = this.metrics.errors.get(endpoint) || 0;
            errorRates[endpoint] = (errors / count * 100).toFixed(2);
        }
        return errorRates;
    }

    calculateAverageLatencies() {
        const averages = {};
        for (const [endpoint, latencies] of this.metrics.latencies) {
            if (latencies.length > 0) {
                const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
                averages[endpoint] = Math.round(avg);
            }
        }
        return averages;
    }

    getRecentRateLimitHits(windowMs = 60000) {
        const now = Date.now();
        return this.metrics.rateLimit.timestamps.filter(
            ts => now - ts <= windowMs
        ).length;
    }

    async saveMetrics(filename = `metrics-${Date.now()}.json`) {
        const metricsPath = path.join('metrics', filename);
        
        const report = {
            duration: Date.now() - this.startTime,
            totalRequests: Array.from(this.metrics.requestCounts.values())
                .reduce((a, b) => a + b, 0),
            endpoints: Array.from(this.metrics.requestCounts.keys()).map(endpoint => ({
                endpoint,
                requests: this.metrics.requestCounts.get(endpoint),
                errors: this.metrics.errors.get(endpoint) || 0,
                averageLatency: this.calculateAverageLatencies()[endpoint],
                errorRate: this.calculateErrorRates()[endpoint]
            })),
            rateLimit: {
                totalHits: this.metrics.rateLimit.hits,
                timeline: this.metrics.rateLimit.timestamps
            },
            snapshots: this.snapshots
        };

        await fs.writeFile(metricsPath, JSON.stringify(report, null, 2));
        return report;
    }
}