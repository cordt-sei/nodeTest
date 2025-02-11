export const testCases = {
  basic: {
      chainQueries: [
          { name: 'getLatestBlock', path: '/cosmos/base/tendermint/v1beta1/blocks/latest' },
          { name: 'getChainId', path: '/cosmos/base/tendermint/v1beta1/node_info' }
      ],
      evmQueries: [
          { name: 'getBlockNumber', method: 'eth_blockNumber' },
          { name: 'getGasPrice', method: 'eth_gasPrice' }
      ]
  },
  complex: {
      contractInteractions: [
          { name: 'listContracts', path: '/cosmwasm/wasm/v1/code' },
          { name: 'getContract', path: '/cosmwasm/wasm/v1/contract/{address}' }
      ],
      oracleQueries: [
          { name: 'getPrices', path: '/seiprotocol/seichain/oracle/prices' }
      ]
  }
};