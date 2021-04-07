# Zerodha Trades Loader

Load trade transactions in bulk from text file to [Zerodha](https://zerodha.com/).

#### Disclaimer

**I'm not responsible if this script messes anything with your holdings, I created
it for my own use and felt like sharing it here, so run this script at your own
risk!**

### What is it about?

I recently transferred all of my mutual funds from a different demat account into Zerodha Coin.
The funds that were transferred were bought over the course of past 5 years via
Systematic Investment Plan with transactions happening on monthly basis. The transfer
of units from old demat account to Zerodha demat account happened without issues but
it didn't include details of individual purchase transactions like date, price and
quantity. Instead, it showed up all the units combined and presented me with
[Holdings discrepancies](https://support.zerodha.com/category/console/portfolio/articles/why-is-the-buy-average-for-some-shares-shown-as-n-a).

In this case, user would typically see following UI on [Holdings page](https://console.zerodha.com/portfolio/holdings/discrepancy/MF/);

![Holdings discrepancies](https://i.imgur.com/TM0R563.png)

Here, you'd need to click on `Add trade` button and manually add transaction date,
average price and quantity for each transaction for a selected mutual fund. This is
tedious, and Zerodha has no way to add transactions in bulk via spreadsheet or CSV
file.

Hence I created this script using [Puppeteer](https://pptr.dev/) which takes a
data file containing all the transactions and inserts trade entries using Zerodha's
UI. So if you're in a situation like me where you recently transferred bunch of your
MFs into Zerodha, this script might be useful for you. Also, this script is not
limited to just handling MFs, as you can use it for any holdings discrepancies.

### Configuration

Not everything is covered in this readme and most of configuration options are
defined in `config.yml` with inline comments about what each option means, refer
to it and change the values accordingly before proceeding.

### How to use it?

Here are the steps that you need to follow;

1. Make sure you have following things installed;
   - Chrome or Chromium browser.
   - Latest version of NodeJS.
2. Clone this repo using `git clone` and then run `npm install`.
3. Launch Chrome instance with remote debugging enabled.
   Refer to [this guide](https://robocorp.com/docs/development-guide/browser/how-to-attach-to-running-chrome-browser) on how to do it.
   - When launched, it will log a debug URL starting with `ws://`, copy that URL
     and paste it as value of `webpage.debug_url` within `config.yml`.
4. Now visit your [Zerodha Console](https://console.zerodha.com/portfolio/holdings/discrepancy/MF/) and open any of the fund tab by clicking on the left sidebar.
5. Open your transaction statement (it might be a PDF or a spreadsheet) for the same fund and create `transactions.txt` file with details like date, price and quantity. Keep following things in mind while creating this file;
   - This file is essentially a CSV file without column headers with one transaction per line.
   - Make sure that transaction dates are parseable by JavaScript.
   - By default, `|` symbol is used a column separator (defined in `config.yml`) but you can change it to something else.
   - Refer to `sample_transactions.txt` in this project to understand how the file structure needs to be.
6. Once data file is ready, just run `npm start path/to/transactions.txt`.
7. Repeat steps 5. & 6. for each fund.
8. Be sure to verify the entries and see if you didn't miss anything before the trades are confirmed by Zerodha, as then edits are not allowed.

### Is this script reliable?

I used it to load around 500+ transactions and only manual steps needed were in
preparing `transactions.txt` file from transaction statement PDF that I had from
my older demat account, so for me it was fairly reliable.

#### Known issue

Since holdings are usually in a fractional number, you'd often encounter an error
while adding a last transaction stating that total holdings cannot exceed discrepant
holdings, usually this is due to how rounding-off works and you may have to manually
adjust the value for the last transaction.

### Why not just ask Zerodha to do all this for you?

I'd have loved if Zerodha supported this feature natively but it doesn't, and
you may have to raise support ticket if you want your case to be solved by them.
Besides, I wanted to learn using Puppeteer so this project was perfect for it.

## Author

[Kushal Pandya](https://doublslash.com/)
