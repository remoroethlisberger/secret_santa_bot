require("dotenv").config();
const client = require("webex");
const fs = require("fs");
const https = require("https");
const {
  EMAILS,
  ADMINS,
  MESSAGES,
  REGISTRATION_DEADLINE,
} = require("../config/constants");
const card = require("../config/card.json");

const { db } = require("../db/db");

const { check_authentication } = require("./authentication");

const webex = client.init({
  credentials: {
    access_token: process.env.WEBEX_ACCESS_TOKEN,
  },
});

webex["attachmentActions"].listen().then(() => {
  console.log(`Listening for events from the attachmentActions resource`);

  // Register a handler to forward the event - we assume that we will only have one card to act on!
  webex["attachmentActions"].on("created", async (event_object) => {
    let body = event_object;
    const ID = body.data.id;
    const personId = body.data.personId;
    const person = await webex.people.get(personId);
    const authentication = check_authentication(person.emails[0]);

    if (authentication.participant) {
      var options = {
        method: "GET",
        hostname: "webexapis.com",
        path: `/v1/attachment/actions/${ID}`,
        headers: {
          Authorization: `Bearer ${process.env.WEBEX_ACCESS_TOKEN}`,
        },
        maxRedirects: 20,
      };

      let data = await doRequest(options, "");

      if (new Date().getTime() > REGISTRATION_DEADLINE) {
        await sendNotification(
          personId,
          MESSAGES.REGISTRATION_PERIOD_EXPIRED()
        );
        return;
      }

      let formData = data.inputs;

      // returns an object with property registered and updated
      let r = await db.addOrUpdateEntry({
        ...person,
        ciscoEmail: person.emails[0],
        office: formData.office ? formData.office : "",
        participate: formData.participate,
      });

      if (r.errors) {
        await sendNotification(personId, MESSAGES.ERROR_FORM_VALIDATION());
      } else if (r.registered && r.updated) {
        await sendNotification(personId, MESSAGES.UPDATED_RESPONSE(formData));
      } else if (r.registered && !r.updated) {
        await sendNotification(personId, MESSAGES.YES_RESPONSE(formData));
      } else {
        await sendNotification(personId, MESSAGES.NO_RESPONSE());
      }
    } else {
      await sendNotification(personId, MESSAGES.NOT_A_PARTICIPANT());
    }
  });
});

webex["messages"].listen().then(() => {
  console.log(`Listening for events from the messages resource`);
  // Register a handler to forward the event
  webex["messages"].on("created", async (event_object) => {
    let body = event_object;
    let message = await getMessage(body.data.id);

    let me = await getMyself();
    let email = message.personEmail;
    let auth = check_authentication(email);
    let command = message.text.toLowerCase();

    if (message.personId == me.id) {
      return; // do nothing upon own message
    } else if (!auth.participant && !auth.admin) {
      sendNotification(personId, MESSAGES.NOT_A_PARTICIPANT());
    } else if (command === "card" || command == "form") {
      sendCard(message.personId);
    } else if (command === "person" || command === "who") {
      if (new Date().getTime() > REGISTRATION_DEADLINE) {
        const receiver = await db.findPersonToSendAGift(email);
        if (receiver) {
          const person = await webex.people.get(message.personId);
          sendNotification(
            message.personId,
            MESSAGES.SEND_GIFT_RECEIVER(person, receiver)
          );
        } else {
          sendNotification(message.personId, MESSAGES.ERROR_HAS_OCCURED());
        }
      } else {
        sendNotification(message.personId, MESSAGES.SEND_NOT_YET_SHUFFLED());
      }
    } else if (command === "help") {
      sendNotification(message.personId, MESSAGES.HELP_MESSAGE());
    } else if (command === "registration" && auth.admin) {
      let filename = await db.createExportFile();
      // Send the file
      let stream = fs.createReadStream(filename);
      let response = await webex.messages.create({
        toPersonId: message.personId,
        markdown: `List of current registrations`,
        files: [stream],
      });
    } else if (command === "inviteall" && auth.admin) {
      EMAILS.forEach((email) => {
        sendCard(undefined, email);
      });
    } else if (command === "shuffle" && auth.admin) {
      await db.shuffle();
    } else if (command === "notify" && auth.admin) {
      participants = await db.getAll();

      participants.forEach(async (participant) => {
        let receiver = await db.findPersonToSendAGift(participant.email);
        await sendNotification(
          undefined,
          MESSAGES.SEND_GIFT_RECEIVER(participant, receiver),
          participant.email
        );
      });
    }
  });
});

const getMyself = async () => {
  let person = await webex.people.get("me");
  return person;
};

const sendCard = async (personId, personEmail = undefined) => {
  const attachment = [
    {
      contentType: "application/vnd.microsoft.card.adaptive",
      content: card,
    },
  ];
  let o = undefined;

  if (!personEmail && !personId) {
    throw new Error("Please specify a reciver for your card!");
  } else if (personId) {
    o = {
      toPersonId: personId,
      text: MESSAGES.WECLOME_MESSAGE(),
      attachments: attachment,
    };
  } else if (personEmail) {
    o = {
      toPersonEmail: personEmail,
      text: MESSAGES.WECLOME_MESSAGE(),
      attachments: attachment,
    };
  }

  webex.messages.create(o);
};

const getMessage = async (id) => {
  let message = await webex.messages.get(id);
  return message;
};

const sendNotification = async (personId, message, email = undefined) => {
  if (message && personId) {
    await webex.messages.create({
      text: message,
      toPersonId: personId,
    });
  } else if (!personId && email) {
    await webex.messages.create({
      text: message,
      toPersonEmail: email,
    });
  } else {
    throw new Error("Invalid operation");
  }
};

/**
 * Do a request with options provided.
 *
 * @param {Object} options
 * @param {Object} data
 * @return {Promise} a promise of request
 */
function doRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.setEncoding("utf8");
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        resolve(JSON.parse(responseBody));
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

module.exports = {
  sendCard,
  getMessage,
};
