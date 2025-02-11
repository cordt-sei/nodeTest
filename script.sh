#!/bin/bash

# Create directory structure
mkdir -p src/{config,core,modes/{load,exhaustive},endpoints,analyzers,utils}
mkdir -p test
mkdir -p logs
mkdir -p reports
mkdir -p metrics

# Create base files
touch src/index.js
touch src/config/{index.js,testCases.js}
touch src/core/{tester.js,logger.js}
touch src/modes/load/{index.js,loadTester.js}
touch src/modes/exhaustive/{index.js,exhaustiveTester.js}
touch src/analyzers/{responseAnalyzer.js,metricCollector.js}
touch src/utils/{helpers.js,constants.js}
touch .env.example

# Create example .env file
cat > .env.example << EOL
SEI_RPC_ENDPOINT=https://archive.sei.hellomoon.io
SEI_AUTH_TOKEN=your_token_here
TEST_CONCURRENCY=5
MAX_REQUESTS_PER_SECOND=10
LOG_LEVEL=info
EOL

# Create ESLint configuration
cat > .eslintrc.json << EOL
{
  "env": {
    "node": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "rules": {
    "indent": ["error", 2],
    "linebreak-style": ["error", "unix"],
    "quotes": ["error", "single"],
    "semi": ["error", "always"]
  }
}
EOL
