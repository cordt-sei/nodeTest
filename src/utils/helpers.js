// src/utils.js
import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import fs from 'fs/promises';

export async function makeRequest(url, options = {}) {
    const startTime = Date.now();
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    const responseData = await response.text();
    const duration = Date.now() - startTime;

    return {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        data: parseResponse(responseData),
        duration
    };
}

export async function sendContractQuery(restAddress, contractAddress, payload, skip400ErrorLog = false) {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const requestUrl = `${restAddress}/cosmwasm/wasm/v1/contract/${contractAddress}/smart/${encodedPayload}`;

    try {
        const response = await makeRequest(requestUrl);

        if (response.status === 400 && skip400ErrorLog) {
            // Extract available methods from error message
            const methodMatch = response.data?.message?.match(/expected one of `([^`]+)`/);
            if (methodMatch) {
                return { 
                    methods: methodMatch[1].split('`, `'),
                    status: 400,
                    isExpectedError: true
                };
            }
        }

        return response;
    } catch (error) {
        if (!(skip400ErrorLog && error.status === 400)) {
            await log(`Error querying contract ${contractAddress}: ${error.message}`, 'ERROR');
        }
        return { status: error.status || 500, error: error.message };
    }
}

export async function fetchPaginatedData(url, params = {}, options = {}) {
    const {
        limit = 100,
        retries = 3,
        delay = 1000
    } = options;

    let allData = [];
    let nextKey = null;

    do {
        const queryParams = new URLSearchParams({
            'pagination.limit': limit,
            ...params,
            ...(nextKey && { 'pagination.key': nextKey })
        });

        const response = await retryWithBackoff(() => 
            makeRequest(`${url}?${queryParams}`),
            retries,
            delay
        );

        if (!response || response.status !== 200) break;

        allData = allData.concat(response.data.results || []);
        nextKey = response.data.pagination?.next_key;

    } while (nextKey);

    return allData;
}

export async function retryWithBackoff(operation, retries = 3, baseDelay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === retries - 1) throw error;
            const delay = baseDelay * Math.pow(2, i) * (0.5 + Math.random() * 0.5);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function parseResponse(data) {
    try {
        return JSON.parse(data);
    } catch {
        return data;
    }
}

async function log(message, level = 'INFO') {
    const entry = `[${new Date().toISOString()}] [${level}] ${message}\n`;
    await fs.appendFile('logs/test.log', entry).catch(() => {});
    if (level === 'ERROR') console.error(message);
    if (level === 'INFO') console.log(message);
}