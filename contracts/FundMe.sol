// SPDX-License-Identifier: MIT
//pragma
pragma solidity ^0.8.7;
//import
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";
//Error Codes
error FundMe__NotOwner();

//Interfaces, Liabraris, Contract
contract FundMe {
    //Type Declarations
    using PriceConverter for uint256;
    //state Variables
    uint256 public constant MINIMUMUSD = 50 * 1e18; //constant表示常量，初始化后无法被改变；可以节省gas；大写命名
    address[] public funders;
    mapping(address => uint256) public addressToAnountFunded;
    address public immutable i_owner; //immutable表示不可变的变量，被赋值后无法被改变；节省gas；i_开头命名
    AggregatorV3Interface public priceFeed;

    //Modifiers
    modifier onlyOwner() {
        // require(msg.sender == i_owner);
        if (msg.sender != i_owner) revert FundMe__NotOwner();
        _;
    }

    constructor(address priceFeedAddress) {
        //构造函数，在合约部署时直接执行。
        i_owner = msg.sender;
        priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    function fund() public payable {
        require(
            msg.value.getConversionRate(priceFeed) >= MINIMUMUSD,
            "Didn't send enougth"
        );
        funders.push(msg.sender);
        addressToAnountFunded[msg.sender] += msg.value;
    }

    //0×8A753747A1Fa494EC906cE90E9f37563A8AF630e

    function withdrow() public onlyOwner {
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            addressToAnountFunded[funder] = 0;
        }

        funders = new address[](0);
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }
}
