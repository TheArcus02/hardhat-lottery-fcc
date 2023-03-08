import { network } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deployMocks: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { getNamedAccounts, deployments, ethers } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId: number = network.config.chainId!

    const BASE_FEE = ethers.utils.parseEther('0.25') // 0.25 is the premium. It costs 0.25 LINK per request
    const GAS_PRICE_LINK = 1e9

    if (chainId === 31337) {
        log('Local network detected! Deploying mocks...')
        await deploy('VRFCoordinatorV2Mock', {
            contract: 'VRFCoordinatorV2Mock',
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        })
        log('Mocks deployed!')
        log('-----------------------------------------------------')
        log("You are deploying to a local network, you'll need a local network running to interact")
        log(
            'Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!'
        )
        log('-----------------------------------------------------')
    }
}

export default deployMocks
deployMocks.tags = ['all', 'mocks']
