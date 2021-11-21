exports.EMAILS = require("./emails.json");
exports.ADMINS = require("./admins.json");
exports.REGISTRATION_DEADLINE = new Date("2021-11-22 23:00:00 UTC");
exports.MESSAGES = {
  NOT_A_PARTICIPANT: () => {
    return "Sorry it looks like you are not part of the Cisco Switzerland employees, living in Switzerland...";
  },
  NOT_ALLOWED: () => {
    return "Sorry you don't have the right access to perform this request.";
  },
  REGISTRATION_PERIOD_EXPIRED: () => {
    return "Sorry but the registration period has already passed...";
  },

  ERROR_FORM_VALIDATION: () => {
    return "Ups, something went wrong, please try again - make sure to select all fields that are present!";
  },
  YES_RESPONSE: ({ office }) => {
    return `You have successfully enrolled in the Secret Santa game! Your gifts will be sent to the Cisco office in ${office}. Thank you for participating!`;
  },
  NO_RESPONSE: () => {
    return "It's never too late, you can still change your mind... From all of us as ONE Cisco Switzerland we wish you happy holidays and successful end of CY2021!";
  },
  UPDATED_RESPONSE: ({ office }) => {
    return `Your registration has been updated! Your gifts will be sent to the Cisco office in ${office}. Thank you for participating!`;
  },
  WECLOME_MESSAGE: () => {
    return `Weclome to the Secret Santa Event!`;
  },
  HELP_MESSAGE: () => {
    return `This is the Secret Santa Bot, you can type "form", "help" or "register" to show the registration from. Type "person" to see who you should send a gift too.`;
  },
  SEND_NOT_YET_SHUFFLED: () => {
    return `We have not yet shuffled. Please be paitent, we will send you the persons name and office address around the ${exports.REGISTRATION_DEADLINE.toDateString()} with more details...`;
  },
  ERROR_HAS_OCCURED: () => {
    return `Ups! Sorry, an error has occured...`;
  },
  SEND_GIFT_RECEIVER: (person, { firstname, lastname, office, email }) => {
    return `
Dear ${person.firstName}
    
You are the Secret Santa of: ${firstname} ${lastname}

Please send the gift to the office in ${office}:

${firstname} ${lastname}
${
  office == "Wallisellen"
    ? `Cisco Systems GmbH
Richtistrasse 7
8304 Wallisellen`
    : `Cisco Systems GmbH
Av. des Uttins 5
1180 Rolle`
}
    
Please pack your gift nicely and send it to the above address together with the remark Secret Santa visible on the package. Please also remember that your gift should not exceed the value of CHF 20.- and arrive at the office ahead of Christmas...

Once your Secret Santa has sent his package to the office, you will be notified.

Thanks a lot for participating and happy holidays! 🎄🎁
    `;
  },
};
