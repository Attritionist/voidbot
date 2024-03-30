const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

// replace the value below with the Telegram token you receive from @BotFather
const TELEGRAM_CHAT_ID = process.env["TELEGRAM_CHAT_ID"];
const TELEGRAM_BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"];
const TOKEN_CONTRACT = process.env["TOKEN_CONTRACT"];


const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const tokenDecimals = 18; // Replace with the actual decimals value
const initialSupply = 100000000;
const uniswapPairAddress = "0xc53a5245069ec40a7750c652454a4310aed2bef1"; // Uniswap V3 LP pair address
const burnAnimation = "https://voidonbase.com/burn.gif";
const voidAnimation = "https://voidonbase.com/void.gif";
const fs = require("fs");
const lockFilePath = "bot.lock";
const processedTransactionsFilePath = "processed_transactions.json";
let processedTransactions = new Set();
if (fs.existsSync(processedTransactionsFilePath)) {
  const data = fs.readFileSync(processedTransactionsFilePath, "utf-8");
  if (data.trim()) {
    try {
      // Parse the JSON data into an array
      const parsedData = JSON.parse(data);
      if (Array.isArray(parsedData)) {
        // Initialize processedTransactions as a set with the parsed array data
        processedTransactions = new Set(parsedData);
      } else {
        throw new Error("Data read from file is not in the expected format");
      }
    } catch (error) {
      console.error("Error parsing processed transactions data:", error);
    }
  }
}
if (fs.existsSync(lockFilePath)) {
  console.log("Another instance of the bot is already running.");
  process.exit(1); // Exit the current instance
} else {
  // Create a lock file
  fs.writeFileSync(lockFilePath, "");
}
// Remove the lock file when the process exits
process.on("exit", () => {
  fs.unlinkSync(lockFilePath);
});
// Function to save processed transactions to file
function saveProcessedTransactions() {
  try {
    // Convert the set to an array before saving to JSON
    const data = JSON.stringify(Array.from(processedTransactions));
    fs.writeFileSync(processedTransactionsFilePath, data, "utf-8");
  } catch (error) {
    console.error("Error saving processed transactions to file:", error);
  }
}

async function getEthUsdPrice() {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    );
    const ethPrice = response.data.ethereum.usd;
    return ethPrice;
  } catch (error) {
    console.error("Error fetching ETH-USD price:", error);
    return null;
  }
}

// Add a setInterval call to getEthUsdPrice function with a 120-second interval
setInterval(async () => {
  const ethUsdPrice = await getEthUsdPrice();
  if (ethUsdPrice !== null) {
    // Update the global variable with the latest ETH-USD price
    currentEthUsdPrice = ethUsdPrice;
  }
}, 12000);

let currentEthUsdPrice = null;

async function detectUniswapTransactions() {
  try {
    // Check if there's a valid ETH-USD price available
    if (currentEthUsdPrice === null) {
      console.log("Waiting for ETH-USD price data...");
      return;
    }

    // Use the latest ETH-USD price fetched by getEthUsdPrice function
    const ethUsdPrice = currentEthUsdPrice;

    const apiUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=${TOKEN_CONTRACT}&address=${uniswapPairAddress}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl);

    if (response.data.status !== "1") {
      throw new Error("Failed to retrieve Uniswap transactions");
    }

    const newTransactions = response.data.result.filter(
      (transaction) => !processedTransactions.has(transaction.hash),
    );
    for (const transaction of newTransactions) {
      const amountTransferred = Number(transaction.value) / 10 ** tokenDecimals;
      const isBuy =
        transaction.from.toLowerCase() === uniswapPairAddress.toLowerCase();
        const AddressOf = isBuy ? transaction.to : transaction.from;
        const addressLink = `https://debank.com/profile/${AddressOf}`;
      const txHashLink = `https://basescan.org/tx/${transaction.hash}`;
      const chartLink =
        "https://dexscreener.com/base/0xBf949F74Eb6Ae999f35e4706A236f8792b88Cb73";

      // Fetch ETH amount for the transaction
      const txDetailsUrl = `https://api.basescan.org/api?module=account&action=txlistinternal&txhash=${transaction.hash}&apikey=${ETHERSCAN_API_KEY}`;

      const txDetailsResponse = await axios.get(txDetailsUrl);
      if (txDetailsResponse.data.status === "1") {
        const ethAmount =
          txDetailsResponse.data.result
            .filter((result) => result.isError === "0")
            .reduce((sum, result) => sum + Number(result.value), 0) /
          10 ** 18;
        const VOID_RANKS = {
            "VOID Peasant": 1,
            "VOID Initiate": 10000,
            "VOID Rookie": 25000,
            "VOID Novice": 50000,
            "VOID Aspirant": 75000,
            "VOID Adept": 100000,
            "VOID Apprentice": 125000,
            "VOID Learner": 150000,
            "VOID Student": 200000,
            "VOID Expert": 250000,
            "VOID Acolyte": 300000,
            "VOID Disciple": 350000,
            "VOID Master": 400000,
            "VOID Grandmaster": 450000,
            "VOID Summoner": 500000,
            "VOID Necromancer": 550000,
            "VOID Mage": 600000,
            "VOID Archmage": 650000,
            "VOID Knight": 700000,
            "VOID Sage": 750000,
            "VOID Virtuoso": 800000,
            "VOID Savant": 850000,
            "VOID Shaman": 900000,
            "VOID Magus": 950000,
            "VOID Postulant": 1000000,
            "VOID Druid": 1050000,
            "VOID Wizard": 1100000,
            "VOID Illusionist": 1150000,
            "VOID Warlock": 1200000,
            "VOID Sorcerer": 1250000,
            "VOID Archdruid": 1300000,
            "VOID Enchanter": 1350000,
            "VOID Conjurer": 1400000,
            "VOID Brother": 1450000,
            "VOID High Priest": 1500000,
            "VOID Scion": 1550000,
            "VOID Assasin": 1600000,
            "VOID Admiral": 1650000,
            "VOID Oracle": 1700000,
            "VOID Prophet": 1750000,
            "VOID Emperor": 1800000,
            "VOID Hierophant": 1850000,
            "VOID Rogue": 1900000,
            "VOID Supreme": 1950000,
            "VOID Overlord": 2000000,
            "VOID Tyrant": 2050000,
            "VOID Burgeon": 2100000,
            "VOID Luxuriate": 2150000,
            "VOID Proliferate": 2200000,
            "VOID Alchemist": 2250000,
            "VOID Paladin": 2300000,
            "VOID Diffuse": 2350000,
            "VOID Lord": 2400000,
            "VOID Grand Admiral": 2450000,
            "VOID Despot": 2500000,
            "VOID Sower": 2600000,
            "VOID Cultivator": 2700000,
            "VOID Nurturer": 2800000,
            "VOID Caretaker": 2900000,
            "VOID Custodian": 3000000,
            "VOID Guardian": 3100000,
            "VOID Protector": 3200000,
            "VOID Defender": 3300000,
            "VOID Sentinel": 3400000,
            "VOID Warden": 3500000,
            "VOID Steward": 3600000,
            "VOID Curator": 3700000,
            "VOID Overseer": 3800000,
            "VOID Supervisor": 3900000,
            "VOID Administrator": 4000000,
            "VOID Regent": 4100000,
            "VOID Governor": 4200000,
            "VOID Ruler": 4300000,
            "VOID Monarch": 4400000,
            "VOID Sovereign": 4500000,
            "VOID Liege": 4600000,
            "VOID Potentate": 4700000,
            "VOID Majesty": 4800000,
            "VOID Supremacy": 4900000,
            "VOID Dominion": 5000000,
            "VOID Ascendant": 5250000,
            "VOID Transcendent": 5500000,
            "VOID Sublime": 5750000,
            "VOID Exalted": 6000000,
            "VOID Ethereal": 6250000,
            "VOID Celestial": 6500000,
            "VOID Divine": 6750000,
            "VOID Apotheosis": 7000000,
            "VOID Pantheon": 7250000,
            "VOID Eternity": 7500000,
            "VOID Infinity": 7750000,
            "VOID Omnipotence": 8000000,
            "VOID Omniscience": 8250000,
            "VOID Omnipresence": 8500000,
            "VOID Singularity": 8750000,
            "VOID Absolute": 9000000,
            "VOID Ultimacy": 9250000,
            "VOID Finality": 9500000,
            "VOID Culmination": 9750000,
            "VOID Omega": 10000000,
            "THE VOID": 20000000        
        };
        let voidRank = "Void Peasant"; // Default rank
        const ethValue = ethAmount.toFixed(6);
        const totalSupply = 100000000;
        const dollarValue = (ethAmount * ethUsdPrice).toFixed(2);
        const voidUsdPrice = (ethAmount / amountTransferred) * ethUsdPrice;
        const voidAmount = isBuy
          ? amountTransferred.toFixed(2)
          : amountTransferred.toFixed(2);
        const voidDollarValue = (voidAmount * voidUsdPrice).toFixed(2);
        const emojiCount = Math.min(Math.ceil(amountTransferred / 100000), 96); // Scale up to a maximum of 5 emojis
        let emojiString = "";
        for (let i = 0; i < emojiCount; i++) {
          emojiString += isBuy ? "🟢🔥" : "🔴🤡";
        }
        const marketCap = voidUsdPrice * totalSupply;

        // Fetch VOID token balance for buyer/seller
        const balanceDetailsUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${TOKEN_CONTRACT}&address=${AddressOf}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
        const balanceDetailResponse = await axios.get(balanceDetailsUrl);
        if (balanceDetailResponse.data.status === "1") {
          const voidBalance = balanceDetailResponse.data.result / 10 ** 18;
          // Determine the rank based on VOID token balance
          for (const [rank, threshold] of Object.entries(VOID_RANKS)) {
            if (voidBalance >= threshold) {
              voidRank = rank;
            } else {
              break;
            }
          }

          const message = `${emojiString}\n\n💸 ${
            isBuy ? "Spent" : "Received"
          }: ${ethValue} ${isBuy ? "WETH" : "ETH"} ($${dollarValue})\n💼 ${
            isBuy
              ? `Bought <a href="${addressLink}">${voidAmount} VOID</a>`
              : `Sold ${amountTransferred.toFixed(
                  3,
                )} VOID ($${voidDollarValue})`
          }\n🔎 <a href="${addressLink}">${
            isBuy ? "Buyer" : "Seller"
          }</a>\n<a href="${chartLink}">📈 Chart</a>\n<a href="${txHashLink}">TX Hash</a>\n💰 Market Cap: $${marketCap.toLocaleString()}\n🟣 Remaining VOID Balance: ${voidBalance}\n🛡️ VOID Rank: ${voidRank}`;

          const voidanimationMessageOptions = {
            caption: message,
            parse_mode: "HTML",
          };

          bot.sendAnimation(
            TELEGRAM_CHAT_ID,
            voidAnimation,
            voidanimationMessageOptions,
          );
          processedTransactions.add(transaction.hash);
        } else {
          console.error(
            "Failed to retrieve transaction details:",
            txDetailsResponse.data.message,
          );
        }

        saveProcessedTransactions(processedTransactions);
      }
    }
  } catch (error) {
    console.error("Error detecting Uniswap transactions:", error);
  }
}

async function detectVoidBurnEvent() {
  try {
    const apiUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=${TOKEN_CONTRACT}&address=0x0000000000000000000000000000000000000000&page=1&offset=100&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl);

    if (response.data.status !== "1") {
      throw new Error("Failed to retrieve token transactions");
    }
    await updateTotalBurnedAmount();
    // Loop through transactions
    response.data.result.forEach((transaction) => {
      // Check if transaction is a token burn, not already processed, and not in the set of processed transactions
      if (
        transaction.to.toLowerCase() ===
          "0x0000000000000000000000000000000000000000" &&
        !processedTransactions.has(transaction.hash)
      ) {
        // Add the transaction hash to the set of processed transactions
        processedTransactions.add(transaction.hash);
        // Convert the token amount to a human-readable format
        const amountBurned = Number(transaction.value) / 10 ** tokenDecimals;
        const txHash = transaction.hash;
        const txHashLink = `https://basescan.org/tx/${txHash}`;
        const chartLink =
          "https://dexscreener.com/base/0xBf949F74Eb6Ae999f35e4706A236f8792b88Cb73";
        const percentBurned =
          ((initialSupply - totalBurnedAmount) / initialSupply) * 100;
        totalBurnedAmount += amountBurned;
        // Format the burn message content
        const burnMessage = `VOID Burned!\n\n💀💀💀💀💀\n🔥 Burned: ${amountBurned.toFixed(
          3,
        )} VOID\nPercent Burned: ${percentBurned.toFixed(
          2,
        )}%\n🔎 <a href="${chartLink}">Chart</a> | <a href="${txHashLink}">TX Hash</a>`;

        const burnanimationMessageOptions = {
          caption: burnMessage,
          parse_mode: "HTML",
        };
        bot.sendAnimation(
          TELEGRAM_CHAT_ID,
          burnAnimation,
          burnanimationMessageOptions,
        );
        saveProcessedTransactions();
      }
    });
  } catch (error) {
    console.error("Error detecting token burn event:", error);
  }
}

let totalBurnedAmount = 0; // Initialize totalBurnedAmount to 0

async function updateTotalBurnedAmount() {
  try {
    const apiUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${TOKEN_CONTRACT}&address=0x0000000000000000000000000000000000000000&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl);

    if (response.data.status === "1") {
      // Convert the balance to the appropriate format (considering token decimals)
      const balance = Number(response.data.result) / 10 ** tokenDecimals;

      // Subtract the current balance from the initial supply to get the burned amount
      totalBurnedAmount = initialSupply - balance;
    }
  } catch (error) {
    console.error("Error updating total burned amount:", error);
  }
}
setInterval(detectVoidBurnEvent, 60000);
setInterval(detectUniswapTransactions, 60000);
