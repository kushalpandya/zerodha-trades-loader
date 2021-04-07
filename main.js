("use strict");

const CONFIG_FILE = "config.yml";
const consoleColors = {
  Cyan: "\x1b[36m%s\x1b[0m",
  Red: "\x1b[31m%s\x1b[0m",
};
const commandArgs = process.argv.slice(2);

/**
 * Returns configuration object by reading "config.yml"
 *
 * @returns {Object}
 */
function getConfiguration() {
  let configuration;

  try {
    configuration = require("js-yaml").load(
      require("fs").readFileSync(CONFIG_FILE, "utf-8")
    );
  } catch (e) {
    console.error(`Error reading ${CONFIG_FILE}`, e);
  }

  return configuration;
}

/**
 * Log info message in console.
 * This method will only log a message when
 * configuration.enable_logging is set to `true`.
 *
 * @param {String} message
 */
function consoleInfo(message) {
  const { enable_logging } = getConfiguration();

  if (enable_logging) console.info(consoleColors.Cyan, message);
}

/**
 * Pauses main thread for provided milliseconds.
 *
 * @param {Number} ms
 */
function sleep(ms) {
  consoleInfo(`Sleep for ${ms} milliseconds.`);
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Parses provided date string and returns
 * ISO date string without time.
 *
 * @param {String} rawDateString
 */
function getISODateString(rawDateString) {
  const parsedDate = new Date(rawDateString);
  const dateWithoutTime = new Date(
    parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000
  );

  return dateWithoutTime.toISOString().substring(0, 10);
}

/**
 * Returns transactions array of objects
 * where each transaction object contains `date`, `price` & `quantity`.
 *
 * @returns {Array}
 */
async function getTransactions() {
  const { once } = require("events");
  const {
    source_data: { column_separator, columns },
  } = getConfiguration();
  const filePath = commandArgs[0];
  const transactions = [];

  try {
    const lineReader = require("readline").createInterface({
      input: require("fs").createReadStream(filePath),
      crlfDelay: Infinity,
    });
    consoleInfo(`"${filePath}" opened for read.`);

    lineReader.on("line", (line) => {
      const lineParts = line.split(column_separator);

      transactions.push({
        date: getISODateString(lineParts[columns.date]),
        price: lineParts[columns.price],
        quantity: lineParts[columns.quantity],
      });
    });

    await once(lineReader, "close");
    consoleInfo(
      `"${filePath}" closed. Total ${transactions.length} transactions found.`
    );
  } catch (e) {
    console.error(consoleColors.Red, `Error reading "${filePath}"`, e);
  }

  return transactions;
}

/**
 * Returns object containing `browser` & `page` properties
 * referring to Zerodha Console Webpage.
 *
 * @returns {Object}
 */
async function getZerodhaBrowserContext() {
  const puppeteer = require("puppeteer");
  const {
    webpage: { debug_url, base_url },
  } = getConfiguration();

  const browser = await puppeteer.connect({
    browserWSEndpoint: debug_url,
    defaultViewport: null,
  });
  consoleInfo(`Puppeteer connected to browser with debug URL "${debug_url}".`);

  const page = (await browser.pages())
    .filter((page) => page.url().includes(base_url))
    .pop();
  consoleInfo(`Found Zerodha Console webpage with URL "${page.url()}".`);

  return {
    browser,
    page,
  };
}

/**
 * This method adds a Trade transaction on provided
 * console webpage instance with provided transaction object.
 *
 * @param {Object} consoleWebpage Zerodha Console Webpage instance
 * @param {Object} transaction Transaction object containing date, price and quantity
 *
 * @returns {Boolean} `true` when trade insertion was successful, false otherwise.
 */
async function addTradeTransaction(consoleWebpage, transaction) {
  const {
    webpage: { selectors },
    source_data: { trade_type },
  } = getConfiguration();
  const transactionJSONString = JSON.stringify(transaction);
  let success = true;

  try {
    // Launch Modal dialog
    const addTradeBtn = await consoleWebpage.$(selectors.add_trade_button);
    await addTradeBtn.click();

    // Wait while dialog is fully open
    await sleep(1000);
    consoleInfo("Add trade modal dialog opened.");

    // Get element references.
    const dateInputEl = await consoleWebpage.$(selectors.date_input);
    const priceInputEl = await consoleWebpage.$(selectors.price_input);
    const quantityInputEl = await consoleWebpage.$(selectors.quantity_input);
    const typeSelectEl = await consoleWebpage.$(selectors.type_select);
    const addBtn = await consoleWebpage.$(selectors.add_button);

    // Populate a trade transaction
    await dateInputEl.type(transaction.date);
    await priceInputEl.type(transaction.price);
    await quantityInputEl.type(transaction.quantity);
    await typeSelectEl.select(trade_type);
    consoleInfo(`Values populated for transaction ${transactionJSONString}`);

    // Submit trade transaction
    await addBtn.click();
    await consoleWebpage.waitForSelector(selectors.success_notification, {
      visible: true,
    });
    (await consoleWebpage.$(selectors.success_notification_close)).click();
    consoleInfo("Trade added successfully.");
    await sleep(1000);
  } catch (e) {
    console.error(
      consoleColors.Red,
      `Error occured while adding trade for transaction ${transactionJSONString}`
    );
    success = false;
  }

  return success;
}

/**
 * Main Function
 */
(async () => {
  const transactions = await getTransactions(commandArgs[0]);
  const zBrowserContext = await getZerodhaBrowserContext();
  let succeeded = true;

  // Iterate over all the transactions
  for (let i = 0; i < transactions.length; i += 1) {
    succeeded = await addTradeTransaction(
      zBrowserContext.page,
      transactions[i]
    );

    // Break immediately if any transaction fails
    if (!succeeded) {
      break;
    }
  }

  // Show summary.
  if (succeeded) {
    consoleInfo(
      `Added ${transactions.length} trade transactions successfully.`
    );
  } else {
    console.error(
      consoleColors.Red,
      "Errors occured while adding trade transactions."
    );
  }

  // Disconnect browser instance.
  zBrowserContext.browser.disconnect();
  consoleInfo("Puppeteer disconnected.");
})();
