# Sei Network Testing Framework

A comprehensive testing framework for Sei Network endpoints, supporting both load testing and exhaustive testing scenarios.

## Features

- **Dual Testing Modes**
  - Load Testing: Performance and stress testing
  - Exhaustive Testing: Complete endpoint coverage and validation

- **Automatic Response Analysis**
  - Response pattern recognition
  - Schema validation
  - Error categorization
  - Performance metrics collection

- **Smart Test Generation**
  - Progressive test complexity
  - Chain state awareness
  - Dynamic test sequence generation

- **Comprehensive Logging**
  - Detailed request/response logging
  - Performance metrics
  - Error aggregation
  - Test coverage reporting

## Installation

```bash
git clone https://github.com/cordt-sei/nodeTest.git
cd nodeTest
yarn install
```

## Configuration

Create a `.env` file in the root directory:

```env
SEI_RPC_ENDPOINT=https://archive.sei.hellomoon.io
SEI_AUTH_TOKEN=your_token_here
TEST_CONCURRENCY=5
MAX_REQUESTS_PER_SECOND=10
LOG_LEVEL=info
```

## Usage

### Load Testing Mode
```bash
yarn start:load
```

This mode focuses on performance testing with:
- Concurrent request handling
- Rate limiting management
- Performance metrics collection
- Resource utilization tracking

### Exhaustive Testing Mode
```bash
yarn start:exhaustive
```

This mode performs comprehensive endpoint testing:
- Complete API coverage
- Response validation
- Error case testing
- State transition verification

### Analysis Tools
```bash
yarn analyze
```

Analyze collected test results and generate reports.

## Project Structure

```
.
├── src/
│   ├── index.js              # Entry point
│   ├── config/               # Configuration management
│   ├── core/                 # Core testing framework
│   ├── modes/                # Testing mode implementations
│   │   ├── load/            # Load testing specific code
│   │   └── exhaustive/      # Exhaustive testing specific code
│   ├── endpoints/           # Endpoint definitions and handlers
│   ├── analyzers/          # Response analysis tools
│   └── utils/              # Utility functions
├── test/                   # Test suites
├── logs/                   # Test execution logs
└── reports/               # Analysis reports
```

## Adding New Test Cases

Test cases can be added in two ways:

1. **Configuration-based**:
   Add to `src/config/testCases.js`:
   ```javascript
   export const testCases = {
     endpoints: {
       "cosmos/bank/v1beta1/balances": {
         methods: ["GET"],
         parameters: [...],
         validations: [...]
       }
     }
   };
   ```

2. **Programmatic**:
   Create new test case files in `src/modes/exhaustive/cases/`:
   ```javascript
   export class CustomTestCase extends BaseTestCase {
     async execute() {
       // Implementation
     }
   }
   ```

## Response Analysis

The framework automatically analyzes and logs:

- Response patterns
- Error frequencies
- Performance metrics
- Data consistency
- Schema compliance

Analysis results are stored in:
- Real-time logs (`logs/`)
- Aggregated reports (`reports/`)
- Performance metrics (`metrics/`)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/name`)
3. Commit your changes (`git commit -am 'Add feature'`)
4. Push to the branch (`git push origin feature/name`)
5. Create a Pull Request

## License

MIT
