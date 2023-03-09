import { DeployFunction } from 'hardhat-deploy/dist/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
    developmentChains,
    networkConfig,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} from '../helper-hardhat-config'
import { VRFCoordinatorV2Mock } from '../typechain-types'
import { verify } from '../utils/verify'

const deployRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { getNamedAccounts, deployments, network, ethers } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    let vrfCoordinatorV2Address: string | undefined
    let subscriptionId: string | undefined
    let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock | undefined

    const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther('30')

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract<VRFCoordinatorV2Mock>(
            'VRFCoordinatorV2Mock'
        )
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address

        const txResponse = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await txResponse.wait()

        if (txReceipt.events && txReceipt.events[0].args) {
            subscriptionId = txReceipt.events[0].args.subId
            await vrfCoordinatorV2Mock.fundSubscription(subscriptionId!, VRF_SUB_FUND_AMOUNT)
        } else {
            log("No events object. Can't set subscription id.")
        }
    } else {
        vrfCoordinatorV2Address = networkConfig[network.config.chainId!]['vrfCoordinatorV2']
        subscriptionId = networkConfig[network.config.chainId!]['subscriptionId']
    }

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    const args: any[] = [
        vrfCoordinatorV2Address,
        networkConfig[network.config.chainId!]['raffleEntranceFee'],
        networkConfig[network.config.chainId!]['gasLane'],
        subscriptionId,
        networkConfig[network.config.chainId!]['callbackGasLimit'],
        networkConfig[network.config.chainId!]['keepersUpdateInterval'],
    ]

    const raffle = await deploy('Raffle', {
        from: deployer,
        args,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log('Verifying...')
        await verify(raffle.address, args)
    } else if (developmentChains.includes(network.name) && vrfCoordinatorV2Mock && subscriptionId) {
        log('Adding consumer...')
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
    }
    log('-----------------------------------------------------')
}

deployRaffle.tags = ['all', 'raffle']
export default deployRaffle
