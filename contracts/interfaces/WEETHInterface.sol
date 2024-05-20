// SPDX-License-Identifier: MIT
pragma solidity =0.6.10;

interface WEETHInterface {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);

    function getRate() external view returns (uint256);
}
