// function deployFunc(hre){
//     console.log("Hi")
//     hre.getNameAccounts()
//     hre.deployments
// }
// module.exports.default = deployFunc

// module.exports = async (hre) => {
//   const { getNamedAccounts, deployments } = hre
// }

const { network } = require("hardhat")
const {
  networkConfig,
  developmentChainIds,
} = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
require("dotenv").config

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = network.config.chainId

  let ethUsdPriceFeedAddress
  if (chainId == 31337) {
    const ethUsdAggregator = await deployments.get("MockV3Aggregator")
    ethUsdPriceFeedAddress = ethUsdAggregator.address
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
  }
  log("----------------------------------------------------")
  log("Deploying FundMe and waiting for confirmations...")
  //const args = [ethUsdPriceFeedAddress]
  const fundMe = await deploy("FundMe", {
    from: deployer,
    args: [ethUsdPriceFeedAddress],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: network.config.blockConfirmations || 1,
  })
  log(`FundMe deployed at ${fundMe.address}`)
  if (
    !developmentChainIds.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(fundMe.address, [ethUsdPriceFeedAddress])
  }
}

module.exports.tags = ["all", "fundMe"]
