import '@typechain/hardhat'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-ethers'
import 'hardhat-gas-reporter'
import 'dotenv/config'
import 'solidity-coverage'
import 'hardhat-deploy'
import { HardhatUserConfig } from 'hardhat/config'

const GOERLI_RPC_URL =
    process.env.GOERLI_RPC_URL || 'https://eth-goerli.alchemyapi.io/v2/your-api-key'
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x'

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'Your etherscan API key'
const REPORT_GAS = process.env.REPORT_GAS || false

module.exports = {
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            chainId: 31337,
        },
        localhost: {
            chainId: 31337,
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            //   accounts: {
            //     mnemonic: MNEMONIC,
            //   },
            saveDeployments: true,
            chainId: 5,
        },
    },
    etherscan: {
        // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            goerli: ETHERSCAN_API_KEY,
        },
        customChains: [
            {
                network: 'goerli',
                chainId: 5,
                urls: {
                    apiURL: 'https://api-goerli.etherscan.io/api',
                    browserURL: 'https://goerli.etherscan.io',
                },
            },
        ],
    },
    gasReporter: {
        enabled: REPORT_GAS,
        currency: 'USD',
        outputFile: 'gas-report.txt',
        noColors: true,
        // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0,
            1: 0,
        },
        player: {
            default: 1,
        },
    },
    solidity: {
        compilers: [
            {
                version: '0.8.7',
            },
            {
                version: '0.4.24',
            },
        ],
    },
    mocha: {
        timeout: 500000, // 500 seconds max for running tests
    },
}
