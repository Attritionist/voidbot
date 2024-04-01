const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const TELEGRAM_CHAT_ID = process.env["TELEGRAM_CHAT_ID"];
const TELEGRAM_BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"];
const TOKEN_CONTRACT = process.env["TOKEN_CONTRACT"];
const POOL_CONTRACT = process.env["POOL_CONTRACT"];
const MAX_CONSECUTIVE_NO_TRANSACTIONS = 5;
let consecutiveNoBurn = 0;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const tokenDecimals = 18;
const initialSupply = 100000000;
const BURN_SLEEP_DURATION = 5000;
const burnAnimation = "https://voidonbase.com/burn.gif";
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
}, 30000);

let currentEthUsdPrice = null;
const messageQueue = [];
let isSendingMessage = false;

function addToMessageQueue(message) {
  messageQueue.push(message);
}
function addToBurnQueue(message) {
  messageQueue.push(message);
}
async function sendBurnFromQueue() {
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
async function sendMessageFromQueue() {
  if (messageQueue.length > 0 && !isSendingMessage) {
    isSendingMessage = true;
    const message = messageQueue.shift();
    try {
      // Send the message
      await bot.sendPhoto(
        TELEGRAM_CHAT_ID,
        message.photo,
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

async function sendPhotoMessage(photo, options, pinMessage = false) {
  addToMessageQueue({ photo, options });
sendMessageFromQueue();
  if (pinMessage) {
    try {
      // Wait for a short duration to ensure the message is sent before pinning
      await sleep(2000);
      // Pin the message in the group
      await bot.pinChatMessage(TELEGRAM_CHAT_ID, options.message_id, {
        disable_notification: true 
      });
    } catch (error) {
      console.error("Error pinning message:", error);
    }
  }
}
async function sendAnimationMessage(animation, options, pinMessage = false) {
  addToBurnQueue({ animation, options });
  sendBurnFromQueue();

  if (pinMessage) {
    try {
      // Wait for a short duration to ensure the message is sent before pinning
      await sleep(2000);
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

    for (const transaction of newTransactions) {
      const amountTransferred =
        Number(transaction.value) / 10 ** tokenDecimals;
      const isBuy =
        transaction.from.toLowerCase() === POOL_CONTRACT.toLowerCase();
      const AddressOf = isBuy ? transaction.to : transaction.from;
      const addressLink = `https://debank.com/profile/${AddressOf}`;
      const txHashLink = `https://basescan.org/tx/${transaction.hash}`;
      const chartLink =
        "https://dexscreener.com/base/0xb14e941d34d61ae251ccc08ac15b8455ae9f60a5";

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
          "VOID Learner": 5000,
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
          "VOID Seer": 27500,
          "VOID Enchanter": 30000,
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
          "VOID Hierophant": 120000,
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
          let imageUrl = "";
          switch (voidRank) {
            case "VOID Peasant":
              imageUrl = "https://voidonbase.com/rank1.png";
              break;
            case "VOID Initiate":
              imageUrl = "https://voidonbase.com/rank2.png";
              break;
            case "VOID Learner":
              imageUrl = "https://voidonbase.com/rank3.png";
              break;
            case "VOID Rookie":
              imageUrl = "https://voidonbase.com/rank4.png";
              break;
            case "VOID Apprentice":
              imageUrl = "https://voidonbase.com/rank5.png";
              break;
            case "VOID Expert":
              imageUrl = "https://voidonbase.com/rank6.png";
              break;
            case "VOID Acolyte":
              imageUrl = "https://voidonbase.com/rank10.png";
              break;
            case "VOID Disciple":
              imageUrl = "https://voidonbase.com/rank11.png";
              break;
            case "VOID Master":
              imageUrl = "https://voidonbase.com/rank12.png";
              break;
            case "VOID Summoner":
              imageUrl = "https://voidonbase.com/rank14.png";
              break;
            case "VOID Necromancer":
              imageUrl = "https://voidonbase.com/rank15.png";
              break;
            case "VOID Seer":
              imageUrl = "https://voidonbase.com/rank16.png";
              break;
            case "VOID Enchanter":
              imageUrl = "https://voidonbase.com/rank17.png";
              break;
              case "VOID Warrior":
              imageUrl = "https://voidonbase.com/rankwar.png";
              break;
            case "VOID Sage":
              imageUrl = "https://voidonbase.com/rank18.png";
              break;
            case "VOID Shaman":
              imageUrl = "https://voidonbase.com/rank19.png";
              break;
            case "VOID Knight":
              imageUrl = "https://voidonbase.com/rank20.png";
              break;
            case "VOID Sorcerer":
              imageUrl = "https://voidonbase.com/rank21.png";
              break;
            case "VOID Warlock":
              imageUrl = "https://voidonbase.com/rank22.png";
              break;
            case "VOID Archmage":
              imageUrl = "https://voidonbase.com/rank24.png";
              break;
            case "VOID Archdruid":
              imageUrl = "https://voidonbase.com/rank25.png";
              break;
            case "VOID Conjurer":
              imageUrl = "https://voidonbase.com/rank26.png";
              break;
            case "VOID Clairvoyant":
              imageUrl = "https://voidonbase.com/rank27.png";
              break;
            case "VOID Alchemist":
              imageUrl = "https://voidonbase.com/rank28.png";
              break;
            case "VOID Lord":
              imageUrl = "https://voidonbase.com/rank29.png";
              break;
              case "VOID Grandmaster":
              imageUrl = "https://voidonbase.com/rankgm.png";
              break;
              case "VOID Juggernaut":
              imageUrl = "https://voidonbase.com/rankjug.png";
              break;
            case "VOID Hierophant":
              imageUrl = "https://voidonbase.com/rank30.png";
              break;
            case "VOID Creature":
              imageUrl = "https://voidonbase.com/rank32.png";
              break;
            case "VOID Overlord":
              imageUrl = "https://voidonbase.com/rank33.png";
              break;
            case "VOID Emperor":
              imageUrl = "https://voidonbase.com/rank34.png";
              break;
            case "VOID Evoker":
              imageUrl = "https://voidonbase.com/rank35.png";
              break;
            case "VOID Harbinger":
              imageUrl = "https://voidonbase.com/rank36.png";
              break;
            case "VOID Warden":
              imageUrl = "https://voidonbase.com/rank39.png";
              break;
            case "VOID Admiral":
              imageUrl = "https://voidonbase.com/rank40.png";
              break;
            case "VOID Monarch":
              imageUrl = "https://voidonbase.com/rank41.png";
              break;
            case "VOID Sovereign":
              imageUrl = "https://voidonbase.com/rank42.png";
              break;
            case "VOID Majesty":
              imageUrl = "https://voidonbase.com/rank43.png";
              break;
            case "VOID Transcendent":
              imageUrl = "https://voidonbase.com/rank44.png";
              break;
            case "VOID Exalted":
              imageUrl = "https://voidonbase.com/rank45.png";
              break;
            case "VOID Celestial":
              imageUrl = "https://voidonbase.com/rank46.png";
              break;
            case "VOID Divine":
              imageUrl = "https://voidonbase.com/rank47.png";
              break;
            case "VOID Apotheosis":
              imageUrl = "https://voidonbase.com/rank48.png";
              break;
            case "VOID Eternity":
              imageUrl = "https://voidonbase.com/rank49.png";
              break;
            case "VOID Omnipotence":
              imageUrl = "https://voidonbase.com/rank50.png";
              break;
            case "VOID Singularity":
              imageUrl = "https://voidonbase.com/rank51.png";
              break;
            case "VOID Absolute":
              imageUrl = "https://voidonbase.com/rank52.png";
              break;
            case "VOID Omega":
              imageUrl = "https://voidonbase.com/rank53.png";
              break;
            case "THE VOID":
              imageUrl = "https://voidonbase.com/rank54.png";
              break;
            default:
              imageUrl = "https://voidonbase.com/default.png"; // Default image URL if rank not found
              break;
          }
          const message = `${emojiString}\n\n💸 ${
            isBuy ? "Spent" : "Received"
          }: ${ethValue} ${isBuy ? "WETH" : "ETH"} ($${dollarValue})\n💼 ${
            isBuy
              ? `Bought ${voidAmount} VOID (<a href="${addressLink}">View Address</a>)`
              : `Sold ${amountTransferred.toFixed(3)} VOID (<a href="${addressLink}">View Address</a>)`
          }\n<a href="${chartLink}">📈 Chart</a>\n<a href="${txHashLink}">TX Hash</a>\n💰 Market Cap: $${isBuy ? marketCap.toLocaleString() : (marketCap / 2).toLocaleString()}\n🟣 Remaining VOID Balance: ${voidBalance}\n🛡️ VOID Rank: ${voidRank}`;
          

          const voidMessageOptions = {
            caption: message,
            parse_mode: "HTML",
          };
        
          sendPhotoMessage(imageUrl, voidMessageOptions, false);

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
setInterval(detectUniswapTransactions, 15000);
