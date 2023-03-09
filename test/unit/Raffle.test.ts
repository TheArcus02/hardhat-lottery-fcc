import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { assert, expect } from 'chai'
import { BigNumber } from 'ethers'
import { deployments, ethers, network } from 'hardhat'
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
          let interval: number

          const chainId = network.config.chainId

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              player = accounts[1]

              await deployments.fixture(['all'])
              raffle = await ethers.getContract('Raffle', deployer)
              vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock', deployer)

              raffleEntranceFee = await raffle.getEntranceFee()
              interval = (await raffle.getInterval()).toNumber()
          })

          describe('constructor', () => {
              it('initializes the raffle correctly', async () => {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), '0')
                  assert.equal(
                      interval.toString(),
                      networkConfig[chainId!]['keepersUpdateInterval']
                  )
              })
          })

          describe('enterRaffle', () => {
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
              it('emits event on enter', async () => {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      'RaffleEnter'
                  )
              })
              it("Dosen't allow entrance when raffle is calculating", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await network.provider.send('evm_mine', [])

                  await raffle.performUpkeep([])

                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      'Raffle__NotOpen'
                  )
              })
          })

          describe('checkUpKeep', () => {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await network.provider.send('evm_mine', [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isn't open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await network.provider.send('evm_mine', [])
                  await raffle.performUpkeep([])

                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

                  assert.equal(raffleState.toString(), '1')
                  assert.equal(upkeepNeeded, false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  // ! dosen't work with (interval - 1)
                  await network.provider.send('evm_increaseTime', [interval - 2])
                  await network.provider.send('evm_mine', [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it('returns true if enough time has passed, has players, eth, and is open', async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await network.provider.request({ method: 'evm_mine', params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(upkeepNeeded)
              })
          })
      })
