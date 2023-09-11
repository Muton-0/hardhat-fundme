const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async function () {
      let fundMe
      let deployer
      let mockV3Aggregator
      const sendValue = ethers.parseEther("1") //1 ETH
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        const contracts = await deployments.fixture(["all"]) //部署所有的合约

        // const signer = await ethers.getSigner(deployer);
        // const fundMeAddress = contracts["FundMe"].address;
        // fundMe = await ethers.getContractAt("FundMe", fundMeAddress, signer);
        // mockV3Aggregator = contracts["MockV3Aggregator"];
        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        )
      })
      //对构造函数进行测试
      describe("constructor", async function () {
        it("sets the aggregator addresses correctly", async function () {
          const response = await fundMe.priceFeed()
          assert.equal(response, mockV3Aggregator.target)
        })
      })
      //对fund函数进行测试
      describe("fund", async function () {
        it("Fails if you don't send enough ETH", async function () {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          )
        })
        it("updata the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue })
          const response = await fundMe.addressToAnountFunded(deployer)
          assert.equal(response.toString(), sendValue.toString())
        })
        it("Adds funder to array of funders", async function () {
          await fundMe.fund({ value: sendValue })
          const funder = await fundMe.funders(0)
          assert.equal(funder, deployer)
        })
      })
      //对withdraw函数进行测试
      describe("withdraw", async function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue })
        })

        it("withdraw ETH form a single funder", async function () {
          //Arrange
          //funMe或者ether 对象带有provider对象，provider对象有getBalance函数获取其中的资金
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          )
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          )

          //Act
          const transactionResponse = await fundMe.withdraw()
          const transactionReceipt = await transactionResponse.wait(1)
          const { gasUsed, effectiveGasPrice } = transactionReceipt
          const gasCost = gasUsed.mul(effectiveGasPrice) //处理大数，用mul来乘

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          )
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          )
          //Assert
          assert.equal(endingFundMeBalance, 0)
          assert.equal(
            startingDeployerBalance.add(startingFundMeBalance), //处理大数用add会更容易
            endingDeployerBalance.add(gasCost).toString
          )
        })
      })
      //测试withdrew对多个账户的提取
      it("is allows us to withdraw with multiple funders", async () => {
        // Arrange
        const accounts = await ethers.getSigners()
        for (i = 1; i < 6; i++) {
          const fundMeConnectedContract = await fundMe.connect(accounts[i])
          await fundMeConnectedContract.fund({ value: sendValue })
        }
        const startingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        )
        const startingDeployerBalance = await fundMe.provider.getBalance(
          deployer
        )

        // Act
        const transactionResponse = await fundMe.cheaperWithdraw()
        // Let's comapre gas costs :)
        // const transactionResponse = await fundMe.withdraw()
        const transactionReceipt = await transactionResponse.wait()
        const { gasUsed, effectiveGasPrice } = transactionReceipt
        const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
        console.log(`GasCost: ${withdrawGasCost}`)
        console.log(`GasUsed: ${gasUsed}`)
        console.log(`GasPrice: ${effectiveGasPrice}`)
        const endingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        )
        const endingDeployerBalance = await fundMe.provider.getBalance(deployer)
        // Assert
        assert.equal(
          startingFundMeBalance.add(startingDeployerBalance).toString(),
          endingDeployerBalance.add(withdrawGasCost).toString()
        )
        // Make a getter for storage variables
        await expect(fundMe.getFunder(0)).to.be.reverted

        for (i = 1; i < 6; i++) {
          assert.equal(
            await fundMe.getAddressToAmountFunded(accounts[i].address),
            0
          )
        }
      })
      //仅由部署者可以提取资金
      it("Only allows the owner to withdraw", async function () {
        const accounts = await ethers.getSigners()
        const fundMeConnectedContract = await fundMe.connect(accounts[1])
        await expect(fundMeConnectedContract.withdraw()).to.be.revertedWith(
          "FundMe__NotOwner"
        )
      })
    })
