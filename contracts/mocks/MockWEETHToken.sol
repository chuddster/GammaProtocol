// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.10;

import {ERC20Upgradeable} from "../packages/oz/upgradeability/ERC20Upgradeable.sol";

contract MockWEETHToken is ERC20Upgradeable {
    uint256 private rate;

    constructor(string memory _name, string memory _symbol) public {
        __ERC20_init_unchained(_name, _symbol);
        _setupDecimals(18);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function setRate(uint256 _rate) external {
        rate = _rate;
    }

    function getRate() external returns (uint256) {
        return rate;
    }
}
