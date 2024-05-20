// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.6.10;

import {OracleInterface} from "../interfaces/OracleInterface.sol";
import {OpynPricerInterface} from "../interfaces/OpynPricerInterface.sol";
import {WEETHInterface} from "../interfaces/WEETHInterface.sol";
import {SafeMath} from "../packages/oz/SafeMath.sol";

/**
 * Error Codes
 * W1: cannot deploy pricer, weeth address cannot be 0
 * W2: cannot deploy pricer, underlying address cannot be 0
 * W3: cannot deploy pricer, oracle address cannot be 0
 * W4: cannot retrieve price, underlying price is 0
 * W5: cannot set expiry price in oracle, underlying price is 0 and has not been set
 * W6: cannot retrieve historical prices, getHistoricalPrice has been deprecated
 */

/**
 * @title WeethPricer
 * @author Chudnov
 * @notice A Pricer contract for a weeth token
 */
contract WeethPricer is OpynPricerInterface {
    using SafeMath for uint256;

    /// @notice opyn oracle address
    OracleInterface public oracle;

    /// @notice weETH token
    WEETHInterface public weETH;

    /// @notice underlying asset (WETH)
    address public underlying;

    /**
     * @param _weETH weETH
     * @param _underlying underlying asset for weeth
     * @param _oracle Opyn Oracle contract address
     */
    constructor(
        address _weETH,
        address _underlying,
        address _oracle
    ) public {
        require(_weETH != address(0), "W1");
        require(_underlying != address(0), "W2");
        require(_oracle != address(0), "W3");

        weETH = WEETHInterface(_weETH);
        oracle = OracleInterface(_oracle);
        underlying = _underlying;
    }

    /**
     * @notice get the live price for the asset
     * @dev overrides the getPrice function in OpynPricerInterface
     * @return price of 1 weETH in USD, scaled by 1e8
     */
    function getPrice() external view override returns (uint256) {
        uint256 underlyingPrice = oracle.getPrice(underlying);
        require(underlyingPrice > 0, "W4");
        return _underlyingPriceToWeethPrice(underlyingPrice);
    }

    /**
     * @notice set the expiry price in the oracle
     * @dev requires that the underlying price has been set before setting a weETH price
     * @param _expiryTimestamp expiry to set a price for
     */
    function setExpiryPriceInOracle(uint256 _expiryTimestamp) external {
        (uint256 underlyingPriceExpiry, ) = oracle.getExpiryPrice(underlying, _expiryTimestamp);
        require(underlyingPriceExpiry > 0, "W5");
        uint256 weEthPrice = _underlyingPriceToWeethPrice(underlyingPriceExpiry);
        oracle.setExpiryPrice(address(weETH), _expiryTimestamp, weEthPrice);
    }

    /**
     * @dev convert underlying price to weETH price with the weETH to eETH exchange rate (1 eETH ≈ 1 ETH)
     * @param _underlyingPrice price of 1 underlying token (ie 1e18 WETH) in USD, scaled by 1e8
     * @return price of 1 weETH in USD, scaled by 1e8
     */
    function _underlyingPriceToWeethPrice(uint256 _underlyingPrice) private view returns (uint256) {
        uint256 eEthPerWeeth = weETH.getRate();

        return eEthPerWeeth.mul(_underlyingPrice).div(1e18);
    }

    function getHistoricalPrice(uint80) external view override returns (uint256, uint256) {
        revert("W6");
    }
}
