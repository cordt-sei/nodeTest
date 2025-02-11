import { config } from './config/index.js';
import { LoadTester } from './modes/load/index.js';
import { ExhaustiveTester } from './modes/exhaustive/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    const mode = process.argv[2] || 'load';
    const Tester = mode === 'exhaustive' ? ExhaustiveTester : LoadTester;
    
    const tester = new Tester(config);
    
    try {
        await tester.start();
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);