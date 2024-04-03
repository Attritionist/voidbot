const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const TELEGRAM_CHAT_ID = process.env["TELEGRAM_CHAT_ID"];
const TELEGRAM_BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"];
const TOKEN_CONTRACT = process.env["TOKEN_CONTRACT"];
const POOL_CONTRACT = process.env["POOL_CONTRACT"];
const COINGECKO_API = process.env["COINGECKO_API"];

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const tokenDecimals = 18;
const initialSupply = 100000000;

async function getVoidPrice() {
  try {
    const response = await axios.get(
      `https://pro-api.coingecko.com/api/v3/onchain/simple/networks/base/token_price/0x21eCEAf3Bf88EF0797E3927d855CA5bb569a47fc?x_cg_pro_api_key=${COINGECKO_API}`
    );
    const tokenAddress = '0x21eceaf3bf88ef0797e3927d855ca5bb569a47fc'.toLowerCase();
    const voidPrice = response.data.data.attributes.token_prices[tokenAddress];
    return { voidPrice: parseFloat(voidPrice) };
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    return null;
  }
}

setInterval(async () => {
  const priceInfo = await getVoidPrice();
  if (priceInfo !== null) {
    currentVoidUsdPrice = priceInfo.voidPrice;
    console.log(`Updated current VOID USD price to: ${currentVoidUsdPrice}`);
  }
}, 45000);

let currentVoidUsdPrice = null;

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
      await bot.sendPhoto(
        TELEGRAM_CHAT_ID,
        message.photo,
        message.options
      );
    } catch (error) {
      console.error("Error sending message:", error);
    }
    setTimeout(() => {
      isSendingMessage = false;
      sendMessageFromQueue();
    }, 2000);
  }
}

async function sendPhotoMessage(photo, options) {
  addToMessageQueue({ photo, options });
sendMessageFromQueue(); 
  }

let lastProcessedTransactionHash = null;

function getVoidRank(voidBalance) {
  const VOID_RANKS = {
    "THE VOID": 2000000,
    "VOID Omega": 1000000,
    "VOID Absolute": 900000,
    "VOID Singularity": 850000,
    "VOID Omnipotence": 800000,
    "VOID Eternity": 750000,
    "VOID Apotheosis": 700000,
    "VOID Divine": 650000,
    "VOID Celestial": 600000,
    "VOID Exalted": 550000,
    "VOID Transcendent": 500000,
    "VOID Majesty": 450000,
    "VOID Sovereign": 400000,
    "VOID Monarch": 350000,
    "VOID Admiral": 275000,
    "VOID Warden": 250000,
    "VOID Harbinger": 225000,
    "VOID Evoker": 200000,
    "VOID Emperor": 175000,
    "VOID Overlord": 150000,
    "VOID Creature": 140000,
    "VOID Hierophant": 130000,
    "VOID Juggernaut": 120000,
    "VOID Grandmaster": 110000,
    "VOID Lord": 100000,
    "VOID Alchemist": 92500,
    "VOID Clairvoyant": 85000,
    "VOID Conjurer": 80000,
    "VOID Archdruid": 75000,
    "VOID Archmage": 65000,
    "VOID Warlock": 60000,
    "VOID Sorcerer": 55000,
    "VOID Knight": 50000,
    "VOID Shaman": 45000,
    "VOID Sage": 40000,
    "VOID Warrior": 35000,
    "VOID Enchanter": 30000,
    "VOID Seer": 27500,
    "VOID Necromancer": 25000,
    "VOID Summoner": 22500,
    "VOID Master": 20000,
    "VOID Disciple": 15000,
    "VOID Acolyte": 12500,
    "VOID Expert": 10000,
    "VOID Apprentice": 7500,
    "VOID Rookie": 5000,
    "VOID Learner": 2500,
    "VOID Initiate": 1000,
    "VOID Peasant": 1
};

  let voidRank = "Void Peasant";
  for (const [rank, threshold] of Object.entries(VOID_RANKS)) {
      if (voidBalance >= threshold) {
          voidRank = rank;
          break; 
      }
  }

  return voidRank;
}

function getRankImageUrl(voidRank) {
  const rankToImageUrlMap = {
    "VOID Peasant": "https://voidonbase.com/rank1.png",
  "VOID Initiate": "https://voidonbase.com/rank2.png",
  "VOID Learner": "https://voidonbase.com/rank3.png",
  "VOID Rookie": "https://voidonbase.com/rank4.png",
  "VOID Apprentice": "https://voidonbase.com/rank5.png",
  "VOID Expert": "https://voidonbase.com/rank6.png",
  "VOID Acolyte": "https://voidonbase.com/rank10.png",
  "VOID Disciple": "https://voidonbase.com/rank11.png",
  "VOID Master": "https://voidonbase.com/rank12.png",
  "VOID Summoner": "https://voidonbase.com/rank14.png",
  "VOID Necromancer": "https://voidonbase.com/rank15.png",
  "VOID Seer": "https://voidonbase.com/rank16.png",
  "VOID Enchanter": "https://voidonbase.com/rank17.png",
  "VOID Warrior": "https://voidonbase.com/rankwar.png",
  "VOID Sage": "https://voidonbase.com/rank18.png",
  "VOID Shaman": "https://voidonbase.com/rank19.png",
  "VOID Knight": "https://voidonbase.com/rank20.png",
  "VOID Sorcerer": "https://voidonbase.com/rank21.png",
  "VOID Warlock": "https://voidonbase.com/rank22.png",
  "VOID Archmage": "https://voidonbase.com/rank24.png",
  "VOID Archdruid": "https://voidonbase.com/rank25.png",
  "VOID Conjurer": "https://voidonbase.com/rank26.png",
  "VOID Clairvoyant": "https://voidonbase.com/rank27.png",
  "VOID Alchemist": "https://voidonbase.com/rank28.png",
  "VOID Lord": "https://voidonbase.com/rank29.png",
  "VOID Grandmaster": "https://voidonbase.com/rankgm.png",
  "VOID Juggernaut": "https://voidonbase.com/rankjug.png",
  "VOID Hierophant": "https://voidonbase.com/rank30.png",
  "VOID Creature": "https://voidonbase.com/rank32.png",
  "VOID Overlord": "https://voidonbase.com/rank33.png",
  "VOID Emperor": "https://voidonbase.com/rank34.png",
  "VOID Evoker": "https://voidonbase.com/rank35.png",
  "VOID Harbinger": "https://voidonbase.com/rank36.png",
  "VOID Warden": "https://voidonbase.com/rank39.png",
  "VOID Admiral": "https://voidonbase.com/rank40.png",
  "VOID Monarch": "https://voidonbase.com/rank41.png",
  "VOID Sovereign": "https://voidonbase.com/rank42.png",
  "VOID Majesty": "https://voidonbase.com/rank43.png",
  "VOID Transcendent": "https://voidonbase.com/rank44.png",
  "VOID Exalted": "https://voidonbase.com/rank45.png",
  "VOID Celestial": "https://voidonbase.com/rank46.png",
  "VOID Divine": "https://voidonbase.com/rank47.png",
  "VOID Apotheosis": "https://voidonbase.com/rank48.png",
  "VOID Eternity": "https://voidonbase.com/rank49.png",
  "VOID Omnipotence": "https://voidonbase.com/rank50.png",
  "VOID Singularity": "https://voidonbase.com/rank51.png",
  "VOID Absolute": "https://voidonbase.com/rank52.png",
  "VOID Omega": "https://voidonbase.com/rank53.png",
  "THE VOID": "https://voidonbase.com/rank54.png"
  };

  return rankToImageUrlMap[voidRank] || "https://voidonbase.com/rank1.png";
}

async function detectUniswapLatestTransaction() {
  try {
    if (currentVoidUsdPrice === null) {
      console.log("Waiting for VOID price data...");
      return;
    }
    const voidPrice = currentVoidUsdPrice;

    const apiUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=${TOKEN_CONTRACT}&address=${POOL_CONTRACT}&page=1&offset=1&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(apiUrl);

    if (response.data.status !== "1") {
      throw new Error("Failed to retrieve latest Uniswap transaction");
    }

    const transaction = response.data.result[0];
      const isBuy =
      transaction.from.toLowerCase() === POOL_CONTRACT.toLowerCase();
      const AddressOf = isBuy ? transaction.to : transaction.from;
      const addressLink = `https://debank.com/profile/${AddressOf}`;
      const txHashLink = `https://basescan.org/tx/${transaction.hash}`;
      const chartLink =
        "https://dexscreener.com/base/0x21eCEAf3Bf88EF0797E3927d855CA5bb569a47fc";

      const txDetailsUrl = `https://api.basescan.org/api?module=account&action=txlistinternal&txhash=${transaction.hash}&apikey=${ETHERSCAN_API_KEY}`;
      const amountTransferred =
      Number(transaction.value) / 10 ** tokenDecimals;

      const txDetailsResponse = await axios.get(txDetailsUrl);
      if (txDetailsResponse.data.status === "1") {
        const ethAmount = txDetailsResponse.data.result
          .filter((result) => result.isError === "0")
          .reduce((sum, result) => sum + Number(result.value), 0) / 10 ** 18;  
        const ethValue = ethAmount.toFixed(6);

        const totalSupply = initialSupply - totalBurnedAmount;

        const percentBurned = totalBurnedAmount / initialSupply * 100;
        
        const marketCap = voidPrice * totalSupply;
        const emojiCount = Math.min(Math.ceil(amountTransferred / 7000), 96);
        let emojiString = "";
        for (let i = 0; i < emojiCount; i++) {
          emojiString += isBuy ? "🟣🔥" : "🔴🤡";
        }
         const balanceDetailsUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${TOKEN_CONTRACT}&address=${AddressOf}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
        const balanceDetailResponse = await axios.get(balanceDetailsUrl);
        if (balanceDetailResponse.data.status === "1") {
          const voidBalance = balanceDetailResponse.data.result / 10 ** tokenDecimals;
          const voidRank = getVoidRank(voidBalance);
          const imageUrl = getRankImageUrl(voidRank);  
          const transactionvalue = amountTransferred * voidPrice;
          const message = `${emojiString}

💸 ${isBuy ? "Spent" : "Received"}: ${isBuy ? ethValue : ethValue / 2} ETH
💼 ${isBuy
  ? `Bought ${amountTransferred.toFixed(2)} VOID (<a href="${addressLink}">View Address</a>)`
  : `Sold ${amountTransferred.toFixed(2)} VOID (<a href="${addressLink}">View Address</a>)`}
🟣 VOID Price: $${voidPrice}
💰 Market Cap: $${marketCap.toFixed(2)}
🔥 Percent Burned: ${percentBurned.toFixed(2)}%
<a href="${chartLink}">📈 Chart</a>
<a href="${txHashLink}">💱 TX Hash</a>
⚖️ Remaining VOID Balance: ${voidBalance.toFixed(3)}
🛡️ VOID Rank: ${voidRank}`;
const voidMessageOptions = {
  caption: message,
  parse_mode: "HTML",
};


if (transaction.hash === lastProcessedTransactionHash ) {
console.log(`Skipping transaction because of hash}`);
return;

} else {
if (!isBuy) {
  minimumTransactionValueUsd = 5000; // Minimum threshold for buy transactions
} else {
  minimumTransactionValueUsd = 200; // Minimum threshold for sell transactions
}

if (transactionvalue < minimumTransactionValueUsd) {
  console.log(`Skipping transaction below minimum threshold: $${minimumTransactionValueUsd}`);
  return;
}

sendPhotoMessage(imageUrl, voidMessageOptions);
lastProcessedTransactionHash = transaction.hash;
          console.log("Latest transaction:", transaction);
        } }

        }
    
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.error('API rate limit reached, pausing for 60 seconds.');
        await sleep(60000);
      } else {
        console.error("Error in detectUniswapLatestTransaction:", error);
      }
    }
  }

  async function updateTotalBurnedAmount() {
    try {
      const apiUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${TOKEN_CONTRACT}&address=0x0000000000000000000000000000000000000000&apikey=${ETHERSCAN_API_KEY}`;
      const response = await axios.get(apiUrl);
  
      if (response.data.status === "1") {
        const balance = Number(response.data.result) / 10 ** tokenDecimals;
        totalBurnedAmount = balance;
        totalBurnedAmountt = initialSupply - balance;
  
      }
    } catch (error) {
      console.error("Error updating total burned amount:", error);
    }
  }
  setInterval(detectUniswapLatestTransaction, 12000);
  setInterval(updateTotalBurnedAmount, 36000);

