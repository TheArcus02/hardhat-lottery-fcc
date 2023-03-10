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
              raffle = await ethers.getContract('Raffle')
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

          describe('performUpkeep', () => {
              it('Can only run if checkupkeep is true', async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await network.provider.send('evm_mine', [])

                  const tx = await raffle.performUpkeep([])
                  assert(tx)
              })

              it('Reverts when checkupkeep is false', async () => {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      'Raffle__UpkeepNotNeeded'
                  )
              })
              it('Updates the raffle state, emits an event, and calls the vrf coordinator', async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await network.provider.send('evm_mine', [])

                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait()
                  const requestId = txReceipt!.events![1].args!.requestId

                  const raffleState = await raffle.getRaffleState()

                  assert(requestId.toNumber() > 0)
                  assert(raffleState == 1)
              })
          })

          describe('fullfillRandomWords', () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await network.provider.send('evm_mine', [])
              })

              it('Can only be called after performUpKeep', async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith('nonexistent request')
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith('nonexistent request')
              })

              it('picks a winner, restes the lottery, and sends money', async () => {
                  const additionalEntrants = 3
                  const startingAccountIndex = 1

                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[i])
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                  }

                  const startingTimeStamp = await raffle.getLastTimeStamp()

                  await new Promise<void>(async (resolve, reject) => {
                      raffle.once('WinnerPicked', async () => {
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp = await raffle.getLastTimeStamp()
                              const numPlayers = await raffle.getNumberOfPlayers()
                              const winnerBalance = await accounts[1].getBalance()

                              assert.equal(numPlayers.toString(), '0')
                              assert.equal(raffleState.toString(), '0')
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(
                                  winnerBalance.toString(),
                                  winnerStartingBalance
                                      .add(
                                          raffleEntranceFee
                                              .mul(additionalEntrants)
                                              .add(raffleEntranceFee)
                                      )
                                      .toString()
                              )

                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })

                      const tx = await raffle.performUpkeep([])
                      const txReceipt = await tx.wait()
                      const winnerStartingBalance = await accounts[1].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt!.events![1].args!.requestId,
                          raffle.address
                      )
                  })
              })
          })
      })
