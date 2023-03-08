import { DeployFunction } from 'hardhat-deploy/dist/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { developmentChains, networkConfig } from '../helper-hardhat-config'
import { VRFCoordinatorV2Mock } from '../typechain-types'

const deployRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { getNamedAccounts, deployments, network, ethers } = hre
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()

    let vrfCoordinatorV2Address: string | undefined
    let subscriptionId: string | undefined

    const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther('30')

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock: VRFCoordinatorV2Mock = await ethers.getContract(
            'VRFCoordinatorV2Mock'
        )
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address

        const txResponse = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await txResponse.wait(1)

        if (txReceipt.events && txReceipt.events[0].args) {
            subscriptionId = txReceipt.events[0].args.subId
            await vrfCoordinatorV2Mock.fundSubscription(subscriptionId!, VRF_SUB_FUND_AMOUNT)
        } else {
            log('-----------------------------------------------------')
            log("No events object. Can't set subscription id.")
            log('-----------------------------------------------------')
        }
    } else {
        vrfCoordinatorV2Address = networkConfig[network.config.chainId!]['vrfCoordinatorV2']
        subscriptionId = networkConfig[network.config.chainId!]['subscriptionId']
    }

    const entranceFee = networkConfig[network.config.chainId!]['raffleEntranceFee']
    const gasLane = networkConfig[network.config.chainId!]['gasLane']
    const args = [vrfCoordinatorV2Address, entranceFee, gasLane, subscriptionId]

    const raffle = await deploy('Raffle', {
        from: deployer,
        args,
        log: true,
        waitConfirmations: 6,
    })
}
