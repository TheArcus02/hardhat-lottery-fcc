import { ethers } from 'hardhat'

export interface networkConfigItem {
    name?: string
    subscriptionId?: string
    gasLane?: string
    keepersUpdateInterval?: string
    raffleEntranceFee?: string
    callbackGasLimit?: string
    vrfCoordinatorV2?: string
}

export interface networkConfigInfo {
    [key: string]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
    localhost: {},
    hardhat: {},
    // Price Feed Address, values can be obtained at https://doas.chain.link/docs/reference-contracts
    // Default one is ETH/USD contract on Sepolia
    5: {
        name: 'goerli',
        vrfCoordinatorV2: '0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D',
        raffleEntranceFee: ethers.utils.parseEther('0.01').toString(),
        gasLane: '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15',
        subscriptionId: '10707',
        callbackGasLimit: '500000',
        keepersUpdateInterval: '30',
    },
    31337: {
        name: 'hardhat',
        raffleEntranceFee: ethers.utils.parseEther('0.01').toString(),
        gasLane: '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15',
        callbackGasLimit: '500000',
        keepersUpdateInterval: '30',
    },
}

export const developmentChains = ['hardhat', 'localhost']
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6
