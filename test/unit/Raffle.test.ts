import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { assert, expect } from 'chai'
import { BigNumber } from 'ethers'
import { deployments, ethers, getNamedAccounts, network } from 'hardhat'
import { developmentChains, networkConfig } from '../../helper-hardhat-config'
import { Raffle, VRFCoordinatorV2Mock } from '../../typechain-types'

!developmentChains.includes(network.name)
    ? describe.skip
    : describe('Raffle', async () => {
          let raffle: Raffle
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
          let raffleEntranceFee: BigNumber
          let deployer: SignerWithAddress
          let player: SignerWithAddress
          let accounts: SignerWithAddress[]

          const chainId = network.config.chainId

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              player = accounts[1]

              await deployments.fixture(['all'])
              raffle = await ethers.getContract('Raffle', deployer)
              vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock', deployer)

              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe('constructor', async () => {
              it('initializes the raffle correctly', async () => {
                  const raffleState = await raffle.getRaffleState()
                  const interval = await raffle.getInterval()
                  assert.equal(raffleState.toString(), '0')
                  assert.equal(
                      interval.toString(),
                      networkConfig[chainId!]['keepersUpdateInterval']
                  )
              })
          })

          describe('enterRaffle', async () => {
              it("reverts when you don't pay enought", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      'Raffle__NotEnoughEthEntered'
                  )
              })
              it('records players when they enter', async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const playerFromContract = await raffle.getPlayer(0)
                  assert.equal(playerFromContract, deployer.address)
              })
          })
      })
