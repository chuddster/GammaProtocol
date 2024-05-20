import {
  MockPricerInstance,
  MockOracleInstance,
  MockERC20Instance,
  MockWEETHTokenInstance,
  WeethPricerInstance,
} from '../../build/types/truffle-types'

import { underlyingPriceToYTokenPrice } from '../utils'

import BigNumber from 'bignumber.js'
import { createScaledNumber } from '../utils'
const { expectRevert, time } = require('@openzeppelin/test-helpers')

const MockPricer = artifacts.require('MockPricer.sol')
const MockOracle = artifacts.require('MockOracle.sol')

const MockERC20 = artifacts.require('MockERC20.sol')
const MockWEETHToken = artifacts.require('MockWEETHToken.sol')
const WeethPricer = artifacts.require('WeethPricer.sol')

// address(0)
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

contract('WeethPricer', ([owner, random]) => {
  let oracle: MockOracleInstance
  let weth: MockERC20Instance
  let weETH: MockWEETHTokenInstance
  // old pricer
  let wethPricer: MockPricerInstance
  // steth pricer
  let weethPricer: WeethPricerInstance

  before('Deployment', async () => {
    // deploy mock contracts
    oracle = await MockOracle.new({ from: owner })
    weth = await MockERC20.new('WETH', 'WETH', 18)
    weETH = await MockWEETHToken.new('weETH', 'weETH')
    // mock underlying pricers
    wethPricer = await MockPricer.new(weth.address, oracle.address)

    await oracle.setAssetPricer(weth.address, wethPricer.address)
  })

  describe('constructor', () => {
    it('should deploy the contract successfully with correct values', async () => {
      weethPricer = await WeethPricer.new(weETH.address, weth.address, oracle.address)

      assert.equal(await weethPricer.weETH(), weETH.address)
      assert.equal(await weethPricer.underlying(), weth.address)
      assert.equal(await weethPricer.oracle(), oracle.address)
    })

    it('should revert if initializing with weETH = 0', async () => {
      await expectRevert(WeethPricer.new(ZERO_ADDR, weth.address, oracle.address), 'W1')
    })

    it('should revert if initializing with underlying = 0 address', async () => {
      await expectRevert(WeethPricer.new(weETH.address, ZERO_ADDR, oracle.address), 'W2')
    })

    it('should revert if initializing with oracle = 0 address', async () => {
      await expectRevert(WeethPricer.new(weETH.address, weth.address, ZERO_ADDR), 'W3')
    })
  })

  describe('getPrice for weETH', () => {
    const ethPrice = createScaledNumber(470)
    const pricePerShare = new BigNumber('1009262845672227655')
    before('mock data in chainlink pricer and weETH', async () => {
      await oracle.setRealTimePrice(weth.address, ethPrice)
      // await wethPricer.setPrice(ethPrice)
      await weETH.setRate(pricePerShare)
    })
    it('should return the price in 1e8', async () => {
      // how much 1e8 yToken worth in USD
      const weETHprice = await weethPricer.getPrice()
      const expectResult = await underlyingPriceToYTokenPrice(new BigNumber(ethPrice), pricePerShare, weth)

      assert.equal(weETHprice.toString(), expectResult.toString())

      // hard coded answer
      // 1 yWETH = 9.4 USD
      assert.equal(weETHprice.toString(), '47435353746')
    })

    it('should return the new price after resetting answer in underlying pricer', async () => {
      const newPrice = createScaledNumber(500)
      // await wethPricer.setPrice(newPrice)
      await oracle.setRealTimePrice(weth.address, newPrice)
      const weETHprice = await weethPricer.getPrice()
      const expectedResult = await underlyingPriceToYTokenPrice(new BigNumber(newPrice), pricePerShare, weth)
      assert.equal(weETHprice.toString(), expectedResult.toString())
    })

    it('should revert if price is lower than 0', async () => {
      // await wethPricer.setPrice('0')
      await oracle.setRealTimePrice(weth.address, '0')
      await expectRevert(weethPricer.getPrice(), 'W4')
    })
  })

  describe('setExpiryPrice', () => {
    let expiry: number
    const ethPrice = new BigNumber(createScaledNumber(300))
    const pricePerShare = new BigNumber('1009262845672227655')

    before('setup oracle record for weth price', async () => {
      expiry = (await time.latest()) + time.duration.days(30).toNumber()
    })

    it("should revert if oracle don't have price of underlying yet", async () => {
      await expectRevert(weethPricer.setExpiryPriceInOracle(expiry), 'W5')
    })

    it('should set price successfully by arbitrary address', async () => {
      await oracle.setExpiryPrice(weth.address, expiry, ethPrice)
      await weethPricer.setExpiryPriceInOracle(expiry, { from: random })
      const [price] = await oracle.getExpiryPrice(weETH.address, expiry)
      const expectedResult = await underlyingPriceToYTokenPrice(ethPrice, pricePerShare, weth)
      assert.equal(price.toString(), expectedResult.toString())
    })
  })
})
