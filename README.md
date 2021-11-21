# Cisco Secret Santa - Webex Bot

This bot takes a list of invitees and administrators, who can participate in a Secret Santa event. The administratios can send commands to invite the participants as well as reminders to people that have not yet responded. The linked Smartsheet acts as the database to store sensitive data and guarantee privacy.

## Getting started

Create a new bot and retrieve the bot token on [developer.webex.com](https://developer.webex.com). Furthermore retrieve your Smartsheet token on [smartsheet.com](https:/smartsheet.com), put both these tokens in your `.env` file and name them `WEBEX_ACCESS_TOKEN` and `SMARTSHEET_API_TOKEN`.

Add the list of participants and admins in to two lists `config/admin.json` and `config/emails.json`, put in the language of the bot's messages as wished into `config/constants.js` and specify any other constants as needed.

## Running it

In order to run it, install node and and make sure that you have all dependencies installed as needed, run `npm install` and you are good to fire it up using `npm run start`. We also provide a develope mode that reloads your source code, for this run `npm run dev`
