import winston from 'winston';
import path from 'path';

export class Logger {
    constructor(config = {}) {
        this.config = {
            level: 'info',
            filename: `test-${Date.now()}.log`,
            ...config
        };

        this.logger = winston.createLogger({
            level: this.config.level,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                new winston.transports.File({
                    filename: path.join('logs', this.config.filename)
                })
            ]
        });

        // Separate transport for response logging
        this.responseLogger = winston.createLogger({
            format: winston.format.json(),
            transports: [
                new winston.transports.File({
                    filename: path.join('logs', `responses-${Date.now()}.log`)
                })
            ]
        });
    }

    logRequest(data) {
        this.logger.info('Request', data);
    }

    logResponse(data) {
        this.responseLogger.info('Response', data);
    }

    logError(error, context = {}) {
        this.logger.error('Error', {
            error: error.message,
            stack: error.stack,
            ...context
        });
    }

    logMetric(metric) {
        this.logger.info('Metric', metric);
    }

    logWarning(message, data = {}) {
        this.logger.warn(message, data);
    }
}