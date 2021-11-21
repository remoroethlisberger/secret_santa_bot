const { EMAILS, ADMINS } = require("../config/constants");

exports.check_authentication = (email) => {
  let auth = { admin: false, participant: false };

  if (EMAILS.includes(email)) {
    auth.participant = true;
  }
  if (ADMINS.includes(email)) {
    auth.admin = true;
  }
  return auth;
};
