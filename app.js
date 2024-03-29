const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// replace the value below with the Telegram token you receive from @BotFather
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const tokenContractAddress = '0xfc067aaA9CA4d51fa3787BD024bBE5eBAd227AE6';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const tokenDecimals = 18; // Replace with the actual decimals value
const initialSupply = 100000000
const uniswapPairAddress = '0xc53a5245069ec40a7750c652454a4310aed2bef1'; // Uniswap V3 LP pair address
const burnAnimation = 'https://voidonbase.com/burn.gif'
const voidAnimation = 'https://voidonbase.com/void.gif'

const fs = require('fs');
const processedTransactionsFilePath = './processed_transactions.json';
let processedTransactions = new Set();
if (fs.existsSync(processedTransactionsFilePath)) {
    const data = fs.readFileSync(processedTransactionsFilePath, 'utf-8');
    if (data.trim()) {
        try {
            // Parse the JSON data into an array
            const parsedData = JSON.parse(data);
            if (Array.isArray(parsedData)) {
                // Initialize processedTransactions as a set with the parsed array data
                processedTransactions = new Set(parsedData);
            } else {
                throw new Error('Data read from file is not in the expected format');
            }
        } catch (error) {
            console.error('Error parsing processed transactions data:', error);
        }
    }
}

// Function to save processed transactions to file
function saveProcessedTransactions() {
    try {
        // Convert the set to an array before saving to JSON
        const data = JSON.stringify(Array.from(processedTransactions));
        fs.writeFileSync(processedTransactionsFilePath, data, 'utf-8');
    } catch (error) {
        console.error('Error saving processed transactions to file:', error);
    }
}

async function getEthUsdPrice() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const ethPrice = response.data.ethereum.usd;
    return ethPrice;
  } catch (error) {
    console.error('Error fetching ETH-USD price:', error);
    return null;
  }
}

async function getTotalSupply() {
  try {
    const totalSupplyUrl = `https://api.basescan.org/api?module=stats&action=tokensupply&contractaddress=${tokenContractAddress}&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(totalSupplyUrl);

    if (response.data.status === '1') {
      const totalSupply = Number(response.data.result) / (10 ** tokenDecimals);
      return totalSupply;
    } else {
      throw new Error('Failed to retrieve total supply');
    }
  } catch (error) {
    console.error('Error fetching total supply:', error);
    return null;
  }
}

async function detectUniswapTransactions() {
    try {
      const apiUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=${tokenContractAddress}&address=${uniswapPairAddress}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
      const response = await axios.get(apiUrl);
  
      if (response.data.status !== '1') {
        throw new Error('Failed to retrieve Uniswap transactions');
      }
  
      const newTransactions = response.data.result.filter(transaction => !processedTransactions.has(transaction.hash));
      const ethUsdPrice = await getEthUsdPrice();

  
      for (const transaction of newTransactions) {
        const amountTransferred = Number(transaction.value) / (10 ** tokenDecimals);
        const isBuy = transaction.from.toLowerCase() === uniswapPairAddress.toLowerCase();
        const txHashLink = `https://basescan.org/tx/${transaction.hash}`;
        const chartLink = 'https://dexscreener.com/base/0xBf949F74Eb6Ae999f35e4706A236f8792b88Cb73';
        const AddressOf = isBuy ? transaction.to : transaction.from;
        const buyerAddressLink = `https://debank.com/profile/${AddressOf}`;
        const sellerAddressLink = `https://debank.com/profile/${AddressOf}`;
  
        // Fetch ETH amount for the transaction
        const txDetailsUrl = `https://api.basescan.org/api?module=account&action=txlistinternal&txhash=${transaction.hash}&apikey=${ETHERSCAN_API_KEY}`;

        const txDetailsResponse = await axios.get(txDetailsUrl);
        if (txDetailsResponse.data.status === '1') {
          const ethAmount = txDetailsResponse.data.result
            .filter(result => result.isError === '0')
            .reduce((sum, result) => sum + Number(result.value), 0) / (10 ** 18);
            const VOID_RANKS = {
                'VOID Peasant': 1,
                'VOID Acolyte': 250000,
                'VOID Adept': 500000,
                'VOID Apprentice': 750000,
                'VOID Expert': 1000000,
                'VOID Master': 1250000,
                'VOID Grandmaster': 1500000,
                'VOID Knight': 1750000,
                'VOID Archmage': 2000000,
                'VOID Sage': 2250000,
                'VOID Virtuoso': 2500000,
                'VOID Savant': 2750000,
                'VOID Artisan': 3000000,
                'VOID Magus': 3250000,
                'VOID Conjurer': 3500000,
                'VOID Enchanter': 3750000,
                'VOID Sorcerer': 4000000,
                'VOID Warlock': 4250000,
                'VOID Illusionist': 4500000,
                'VOID Alchemist': 4750000,
                'VOID Wizard': 5000000,
                'VOID Necromancer': 5250000,
                'VOID Shaman': 5500000,
                'VOID Summoner': 5750000,
                'VOID Druid': 6000000,
                'VOID Archdruid': 6250000,
                'VOID High Priest': 6500000,
                'VOID Hierophant': 6750000,
                'VOID Prophet': 7000000,
                'VOID Oracle': 7250000,
                'VOID Divine': 7500000,
                'VOID Ascendant': 7750000,
                'VOID Overlord': 8000000,
                'VOID Tyrant': 8250000,
                'VOID Emperor': 8500000,
                'VOID Sovereign': 8750000,
                'VOID Monarch': 9000000,
                'VOID Despot': 9250000,
                'VOID Lord': 9500000,
                'VOID Regent': 9750000,
                'VOID Supreme': 10000000,
              };
              let voidRank = 'Void Peasant'; // Default rank
          const ethValue = ethAmount.toFixed(6);
          const dollarValue = (ethAmount * ethUsdPrice).toFixed(2);
          const voidUsdPrice = ethAmount / amountTransferred * ethUsdPrice;
          const voidAmount = isBuy ? amountTransferred.toFixed(2) : amountTransferred.toFixed(2);
          const voidDollarValue = (voidAmount * voidUsdPrice).toFixed(2);
          const emojiCount = Math.min(Math.ceil(amountTransferred / 100000), 96); // Scale up to a maximum of 5 emojis
          let emojiString = '';
for (let i = 0; i < emojiCount; i++) {
    emojiString += isBuy ? '🟢💸' : '🔴🤡';
}
          const totalSupply = await getTotalSupply();
          const marketCap = voidUsdPrice * totalSupply;
  
          // Fetch VOID token balance for buyer/seller
          const balanceDetailsUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${tokenContractAddress}&address=${AddressOf}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
          const balanceDetailResponse = await axios.get(balanceDetailsUrl);
          if (balanceDetailResponse.data.status === '1') {
            const voidBalance = balanceDetailResponse.data.result / (10 ** 18)
  // Determine the rank based on VOID token balance
for (const [rank, threshold] of Object.entries(VOID_RANKS)) {
    if (voidBalance >= threshold) {
      voidRank = rank;
    } else {
      break;
    }
  }
  const message = `${emojiString}\n\n💸 ${isBuy ? 'Spent' : 'Received'}: ${ethValue} ${isBuy ? 'WETH' : 'ETH'} ($${dollarValue})\n💼 ${isBuy ? `Bought ${voidAmount} VOID` : `Sold ${amountTransferred.toFixed(3)} VOID ($${voidDollarValue})`}\n🔎 ${isBuy ? 'Buyer' : 'Seller'} <a href="${isBuy ? buyerAddressLink : sellerAddressLink}">${isBuy ? AddressOf : AddressOf}</a> <a href="${chartLink}">Chart</a>\n<a href="${txHashLink}">TX Hash</a>\n💰 Market Cap: $${marketCap.toLocaleString()}\n🟣 Remaining VOID Balance: ${voidBalance}\n🛡️ VOID Rank: ${voidRank}`;
  
          const voidanimationMessageOptions = {
            caption: message,
            parse_mode: 'HTML'
          };
  
          bot.sendAnimation(TELEGRAM_CHAT_ID, voidAnimation, voidanimationMessageOptions);
          processedTransactions.add(transaction.hash);
        } else {
          console.error('Failed to retrieve transaction details:', txDetailsResponse.data.message);
        }
      
  
      saveProcessedTransactions(processedTransactions);
    }}} catch (error) {
    console.error('Error detecting Uniswap transactions:', error);
  }
}
async function detectVoidBurnEvent() {
    try {
        const apiUrl = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=${tokenContractAddress}&address=0x0000000000000000000000000000000000000000&page=1&offset=100&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
        const response = await axios.get(apiUrl);

        if (response.data.status !== '1') {
            throw new Error('Failed to retrieve token transactions');
        }
        await updateTotalBurnedAmount();
        // Loop through transactions
        response.data.result.forEach(transaction => {
            // Check if transaction is a token burn, not already processed, and not in the set of processed transactions
            if (transaction.to.toLowerCase() === '0x0000000000000000000000000000000000000000' && !processedTransactions.has(transaction.hash)) {
                // Add the transaction hash to the set of processed transactions
                processedTransactions.add(transaction.hash);
                // Convert the token amount to a human-readable format
                const amountBurned = Number(transaction.value) / (10 ** tokenDecimals);
                const txHash = transaction.hash;
                const txHashLink = `https://basescan.org/tx/${txHash}`;
                const chartLink = 'https://dexscreener.com/base/0xBf949F74Eb6Ae999f35e4706A236f8792b88Cb73';
                const percentBurned = ((initialSupply - totalBurnedAmount) / initialSupply) * 100;
                totalBurnedAmount += amountBurned;
                // Format the burn message content
                const burnMessage = `VOID Burned!\\n\\n💀💀💀💀💀\\n🔥 Burned: ${amountBurned.toFixed(3)} VOID\\nPercent Burned: ${percentBurned.toFixed(2)}%\\n🔎 <a href="${chartLink}">Chart</a> | <a href="${txHashLink}">TX Hash</a>`;
                const burnanimationMessageOptions = {
                    caption: burnMessage,
                    parse_mode: 'HTML'
                };
                bot.sendAnimation(TELEGRAM_CHAT_ID, burnAnimation, burnanimationMessageOptions);
                saveProcessedTransactions();
            }
        });
    } catch (error) {
        console.error('Error detecting token burn event:', error);
    }
}

let totalBurnedAmount = 0;

async function updateTotalBurnedAmount() {
    try {
        const apiUrl = `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${tokenContractAddress}&address=0x0000000000000000000000000000000000000000&apikey=${ETHERSCAN_API_KEY}`;
        const response = await axios.get(apiUrl);

        if (response.data.status === '1') {
            // Convert the balance to the appropriate format (considering token decimals)
            const balance = Number(response.data.result) / (10 ** tokenDecimals);

            // Subtract the current balance from the initial supply to get the burned amount
            totalBurnedAmount = initialSupply - balance;
        }
    } catch (error) {
        console.error('Error updating total burned amount:', error);
    }
}

// Set an interval to periodically check for coin burn events
setInterval(detectVoidBurnEvent, 3000); // Check every 60 seconds
setInterval(detectUniswapTransactions, 3000); // Check every 60 seconds