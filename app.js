const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const TELEGRAM_CHAT_ID = process.env["TELEGRAM_CHAT_ID"];
const TELEGRAM_BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"];
const TOKEN_CONTRACT = process.env["TOKEN_CONTRACT"];
const POOL_CONTRACT = process.env["POOL_CONTRACT"];
const MAX_CONSECUTIVE_NO_TRANSACTIONS = 5;
const VOID_SLEEP_DURATION = 10000;
const BURN_SLEEP_DURATION = 30000;

let consecutiveNoTransactions = 0;
let consecutiveNoBurn = 0;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const tokenDecimals = 18;
const initialSupply = 100000000;
const burnAnimation = "https://voidonbase.com/burn.gif";
const voidAnimation = "https://voidonbase.com/void.gif";
const fs = require("fs");
const processedTransactionsFilePath = "processed_transactions.json";
let processedTransactions = new Set();
if (fs.existsSync(processedTransactionsFilePath)) {
  const data = fs.readFileSync(processedTransactionsFilePath, "utf-8");
  if (data.trim()) {
    try {
      const parsedData = JSON.parse(data);
      if (Array.isArray(parsedData)) {
        processedTransactions = new Set(parsedData);
      } else {
        throw new Error("Data read from file is not in the expected format");
      }
    } catch (error) {
      console.error("Error parsing processed transactions data:", error);
    }
  }
}

function saveProcessedTransactions() {
  try {
    const data = JSON.stringify(Array.from(processedTransactions));
    fs.writeFileSync(processedTransactionsFilePath, data, "utf-8");
  } catch (error) {
    console.error("Error saving processed transactions to file:", error);
  }
}

async function getEthUsdPrice() {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const ethPrice = response.data.ethereum.usd;
    return ethPrice;
  } catch (error) {
    console.error("Error fetching ETH-USD price:", error);
    return null;
  }
}

setInterval(async () => {
  const ethUsdPrice = await getEthUsdPrice();
  if (ethUsdPrice !== null) {
    currentEthUsdPrice = ethUsdPrice;
  }
}, 20000);

let currentEthUsdPrice = null;
const messageQueue = [];
let isSendingMessage = false;

function addToMessageQueue(message) {
  messageQueue.push(message);
}

async function sendMessageFromQueue() {
  if (messageQueue.length > 0 && !isSendingMessage) {
    isSendingMessage = true;
    const message = messageQueue.shift();
    try {
      // Send the message
      await bot.sendAnimation(
        TELEGRAM_CHAT_ID,
        message.animation,
        message.options
      );
    } catch (error) {
      console.error("Error sending message:", error);
    }
    // Wait for 5 seconds before sending the next message
    setTimeout(() => {
      isSendingMessage = false;
      sendMessageFromQueue(); // Send the next message in the queue
    }, 2500);
  }
}

async function sendAnimationMessage(animation, options, pinMessage = false) {
  addToMessageQueue({ animation, options });
  sendMessageFromQueue();

  if (pinMessage) {
    try {
      // Wait for a short duration to ensure the message is sent before pinning
      await sleep(1000);
      // Pin the message in the group
      await bot.pinChatMessage(TELEGRAM_CHAT_ID, options.message_id, {
        disable_notification: true 
      });
    } catch (error) {
      console.error("Error pinning message:", error);
    }
  }
}

async function detectUniswapTransactions() {
  try {
    if (consecutiveNoTransactions >= MAX_CONSECUTIVE_NO_TRANSACTIONS) {
    console.log(`No new transactions detected. Sleeping for ${VOID_SLEEP_DURATION / 1000} seconds...`);
    await sleep(VOID_SLEEP_DURATION);
    consecutiveNoTransactions = 0; // Reset the counter after waking up
  }
    if (currentEthUsdPrice === null) {
      console.log("Waiting for ETH-USD price data...");
      return;
    }

    const ethUsdPrice = currentEthUsdPrice;

    const apiUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=${TOKEN_CONTRACT}&address=${POOL_CONTRACT}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl);

    if (response.data.status !== "1") {
      throw new Error("Failed to retrieve Uniswap transactions");
    }

    const newTransactions = response.data.result.filter(
      (transaction) => !processedTransactions.has(transaction.hash)
    );

    if (newTransactions.length === 0) {
      console.log("No new transactions detected.");
      consecutiveNoTransactions++;
      return;
    }
    consecutiveNoTransactions = 0; // Reset the counter if transactions are found
    for (const transaction of newTransactions) {
      const amountTransferred =
        Number(transaction.value) / 10 ** tokenDecimals;
      const isBuy =
        transaction.from.toLowerCase() === POOL_CONTRACT.toLowerCase();
      const AddressOf = isBuy ? transaction.to : transaction.from;
      const addressLink = `https://debank.com/profile/${AddressOf}`;
      const txHashLink = `https://basescan.org/tx/${transaction.hash}`;
      const chartLink =
        "https://dexscreener.com/base/0xBf949F74Eb6Ae999f35e4706A236f8792b88Cb73";

      const txDetailsUrl = `https://api.basescan.org/api?module=account&action=txlistinternal&txhash=${transaction.hash}&apikey=${ETHERSCAN_API_KEY}`;

      const txDetailsResponse = await axios.get(txDetailsUrl);
      if (txDetailsResponse.data.status === "1") {
        const ethAmount = txDetailsResponse.data.result
          .filter((result) => result.isError === "0")
          .reduce((sum, result) => sum + Number(result.value), 0) / 10 ** 18;
        const VOID_RANKS = {
          "VOID Peasant": 1,
          "VOID Initiate": 1000,
          "VOID Rookie": 2000,
          "VOID Novice": 3000,
          "VOID Aspirant": 4000,
          "VOID Learner": 5000,
          "VOID Student": 6000,
          "VOID Follower": 7000,
          "VOID Apprentice": 8000,
          "VOID Adept": 9000,
          "VOID Expert": 10000,
          "VOID Acolyte": 12500,
          "VOID Disciple": 15000,
          "VOID Master": 17500,
          "VOID Grandmaster": 20000,
          "VOID Summoner": 22500,
          "VOID Necromancer": 25000,
          "VOID Priest": 27500,
          "VOID Seer": 30000,
          "VOID Enchanter": 32500,
          "VOID Rogue": 35000,
          "VOID Sage": 40000,
          "VOID Shaman": 45000,
          "VOID Knight": 50000,
          "VOID Sorcerer": 55000,
          "VOID Warlock": 60000,
          "VOID Assassin": 65000,
          "VOID Archmage": 70000,
          "VOID Archdruid": 75000,
          "VOID Conjurer": 80000,
          "VOID Clairvoyant": 85000,
          "VOID Alchemist": 95000,
          "VOID Lord": 100000,
          "VOID Paladin": 110000,
          "VOID Hierophant": 120000,
          "VOID Prophet": 130000,
          "VOID Creature": 140000,
          "VOID Overlord": 150000,
          "VOID Emperor": 175000,
          "VOID Evoker": 200000,
          "VOID Harbinger": 225000,
          "VOID Guardian": 250000,
          "VOID Protector": 275000,
          "VOID Warden": 300000,
          "VOID Admiral": 325000,
          "VOID Monarch": 350000,
          "VOID Sovereign": 400000,
          "VOID Majesty": 450000,
          "VOID Transcendent": 500000,
          "VOID Exalted": 550000,
          "VOID Celestial": 600000,
          "VOID Divine": 650000,
          "VOID Apotheosis": 700000,
          "VOID Eternity": 750000,
          "VOID Omnipotence": 800000,
          "VOID Singularity": 850000,
          "VOID Absolute": 900000,
          "VOID Omega": 1000000,
          "THE VOID": 2000000       
        };
        let voidRank = "Void Peasant"; // Default rank
        const ethValue = ethAmount.toFixed(6);
        const totalSupply = 100000000;
        const dollarValue = (ethAmount * ethUsdPrice).toFixed(2);
        const voidUsdPrice =
          (ethAmount / amountTransferred) * ethUsdPrice;
        const voidAmount = isBuy
          ? amountTransferred.toFixed(2)
          : amountTransferred.toFixed(2);
        const voidDollarValue = (voidAmount * voidUsdPrice).toFixed(2);
        const emojiCount = Math.min(Math.ceil(amountTransferred / 100000), 96); // Scale up to a maximum of 5 emojis
        let emojiString = "";
        for (let i = 0; i < emojiCount; i++) {
          emojiString += isBuy ? "🟣🔥" : "🔴🤡";
        }
        const marketCap = voidUsdPrice * totalSupply;

         const balanceDetailsUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${TOKEN_CONTRACT}&address=${AddressOf}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
        const balanceDetailResponse = await axios.get(balanceDetailsUrl);
        if (balanceDetailResponse.data.status === "1") {
          const voidBalance = balanceDetailResponse.data.result / 10 ** 18;
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
              ? `Bought ${voidAmount} VOID (<a href="${addressLink}">View Address</a>)`
              : `Sold ${amountTransferred.toFixed(3)} VOID (<a href="${addressLink}">View Address</a>)`
          }\n<a href="${chartLink}">📈 Chart</a>\n<a href="${txHashLink}">TX Hash</a>\n💰 Market Cap: $${marketCap.toLocaleString()}\n🟣 Remaining VOID Balance: ${voidBalance}\n🛡️ VOID Rank: ${voidRank}`;

          const voidanimationMessageOptions = {
            caption: message,
            parse_mode: "HTML",
          };
          sendAnimationMessage(voidAnimation, voidanimationMessageOptions, false);


           processedTransactions.add(transaction.hash);
        } else {
          console.error(
            "Failed to retrieve transaction details:",
            txDetailsResponse.data.message
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
  try {  const apiUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=${TOKEN_CONTRACT}&address=0x0000000000000000000000000000000000000000&page=1&offset=100&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
        const response = await axios.get(apiUrl); 
        if (response.data.status !== "1") {
          throw new Error("Failed to retrieve token transactions");
        }
    if (consecutiveNoBurn >= MAX_CONSECUTIVE_NO_TRANSACTIONS) {
      console.log(`No new burn events detected. Sleeping for ${BURN_SLEEP_DURATION / 1000} seconds...`);
      await sleep(BURN_SLEEP_DURATION);
      consecutiveNoBurn = 0;
    }

    await updateTotalBurnedAmount();

    const newBurnEvents = response.data.result.filter(
      (transaction) =>
        transaction.to.toLowerCase() ===
          "0x0000000000000000000000000000000000000000" &&
        !processedTransactions.has(transaction.hash)
    );

    if (newBurnEvents.length === 0) {
      console.log("No new burn events detected.");
      consecutiveNoBurn++;
      return;
    }
    consecutiveNoBurn = 0; 

    newBurnEvents.forEach((transaction) => {
      processedTransactions.add(transaction.hash);
      const amountBurned =
        Number(transaction.value) / 10 ** tokenDecimals;
      const txHash = transaction.hash;
      const txHashLink = `https://basescan.org/tx/${txHash}`;
      const chartLink =
        "https://dexscreener.com/base/0xBf949F74Eb6Ae999f35e4706A236f8792b88Cb73";
      const percentBurned =
        ((initialSupply - totalBurnedAmount) / initialSupply) * 100;
      totalBurnedAmount += amountBurned;
      const burnMessage = `VOID Burned!\n\n💀💀💀💀💀\n🔥 Burned: ${amountBurned.toFixed(
        3
      )} VOID\nPercent Burned: ${percentBurned.toFixed(
        2
      )}%\n🔎 <a href="${chartLink}">Chart</a> | <a href="${txHashLink}">TX Hash</a>`;

      const burnanimationMessageOptions = {
        caption: burnMessage,
        parse_mode: "HTML",
      };
      sendAnimationMessage(burnAnimation, burnanimationMessageOptions, true);

      saveProcessedTransactions();
    });
  } catch (error) {
    console.error("Error detecting token burn event:", error);
  }
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
let totalBurnedAmount = 0;

async function updateTotalBurnedAmount() {
  try {
    const apiUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${TOKEN_CONTRACT}&address=0x0000000000000000000000000000000000000000&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl);

    if (response.data.status === "1") {
      const balance = Number(response.data.result) / 10 ** tokenDecimals;
      totalBurnedAmount = initialSupply - balance;
    }
  } catch (error) {
    console.error("Error updating total burned amount:", error);
  }
}
setInterval(detectVoidBurnEvent, 15000);
setInterval(detectUniswapTransactions, 5000);
