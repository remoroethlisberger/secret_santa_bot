const SMARTSHEET = require("./config");
const fs = require("fs");
const client = require("smartsheet");
const smartsheet = client.createClient({
  accessToken: process.env.SMARTSHEET_API_TOKEN,
});

const updateable = [SMARTSHEET.OFFICE_COLUMN, SMARTSHEET.PARTICIPATE_COLUMN];

// Adding or updating the entry
const addOrUpdateEntry = async ({
  ciscoEmail,
  firstName,
  lastName,
  office,
  participate,
}) => {
  if (
    !ciscoEmail ||
    !lastName ||
    !firstName ||
    (participate == "Yes" && !office)
  ) {
    return { errors: true };
  }

  // Check if row exists and update or insert to sheet
  try {
    var sheet = await smartsheet.sheets.getSheet({
      id: SMARTSHEET.SMARTSHEET_ID,
    });
    row = false;
    sheet.rows.forEach((_row) => {
      _row.cells.forEach((cell) => {
        if (
          cell.columnId == SMARTSHEET.EMAIL_ADDRESS_COLUMN &&
          cell.value == ciscoEmail
        ) {
          row = _row;
        }
      });
    });
    if (!row) {
      var response = await smartsheet.sheets.addRows({
        sheetId: SMARTSHEET.SMARTSHEET_ID,
        body: [
          {
            toTop: true,
            cells: [
              {
                columnId: SMARTSHEET.REGISTRATION_DATE_COLUMN,
                value: new Date().toLocaleString(),
              },
              { columnId: SMARTSHEET.EMAIL_ADDRESS_COLUMN, value: ciscoEmail },
              { columnId: SMARTSHEET.FIRST_NAME_COLUMN, value: firstName },
              { columnId: SMARTSHEET.LAST_NAME_COLUMN, value: lastName },
              { columnId: SMARTSHEET.OFFICE_COLUMN, value: office },
              { columnId: SMARTSHEET.PARTICIPATE_COLUMN, value: participate },
              { columnId: SMARTSHEET.GIFT_RECEIVER_COLUMN, value: "" }, // the giftee
            ],
          },
        ],
      });
      response.registered = participate == "Yes" ? true : false;
      response.updated = false;
    } else {
      othercells = row.cells.filter(
        (c) =>
          !(
            updateable.includes(c.columnId) ||
            c.columnId == SMARTSHEET.GIFT_RECEIVER_COLUMN
          )
      );
      cell = row.cells.find((c) => c.columnId == SMARTSHEET.OFFICE_COLUMN);
      officeCell = { ...cell, value: office, displayValue: office };
      cell = row.cells.find((c) => c.columnId == SMARTSHEET.PARTICIPATE_COLUMN);
      participateCell = {
        ...cell,
        value: participate,
        displayValue: participate,
      };
      cell = row.cells.find(
        (c) => c.columnId == SMARTSHEET.GIFT_RECEIVER_COLUMN
      );
      giftRecevierCell = {
        ...cell,
        value: cell.value ? cell.value : "",
      };
      row.cells = [
        officeCell,
        participateCell,
        giftRecevierCell,
        ...othercells,
      ];
      row = { id: row.id, cells: row.cells };

      var response = await smartsheet.sheets.updateRow({
        sheetId: SMARTSHEET.SMARTSHEET_ID,
        body: row,
      });
      response.registered = participate == "Yes" ? true : false;
      response.updated = true;
    }
    return response;
  } catch (error) {
    console.error(error.message);
    console.log(error);
    return false;
  }
};

const findPersonToSendAGift = async (ciscoEmail) => {
  if (!ciscoEmail) {
    throw new Error("No email specified");
  } else {
    // Check to whom the corresponding email sends a gift to
    try {
      var sheet = await smartsheet.sheets.getSheet({
        id: SMARTSHEET.SMARTSHEET_ID,
      });
    } catch (error) {
      console.error(error.message);
      console.log(error);
    }
    receiverEmail = undefined;
    sheet.rows.forEach((_row) => {
      _row.cells.forEach((cell) => {
        if (
          cell.columnId == SMARTSHEET.EMAIL_ADDRESS_COLUMN &&
          cell.value == ciscoEmail
        ) {
          _row.cells.filter((cell) => {
            if (cell.columnId == SMARTSHEET.GIFT_RECEIVER_COLUMN) {
              receiverEmail = cell.value;
            }
          });
        }
      });
    });
    if (!receiverEmail) {
      return undefined;
    } else {
      otherPerson = false;
      sheet.rows.forEach((_row) => {
        _row.cells.forEach((cell) => {
          if (
            cell.columnId == SMARTSHEET.EMAIL_ADDRESS_COLUMN &&
            cell.value == receiverEmail
          ) {
            otherPerson = _row;
          }
        });
      });
      let recevier = {};
      otherPerson.cells.forEach((cell) => {
        if (cell.columnId == SMARTSHEET.EMAIL_ADDRESS_COLUMN) {
          recevier.email = cell.value;
        }
        if (cell.columnId == SMARTSHEET.FIRST_NAME_COLUMN) {
          recevier.firstname = cell.value;
        }
        if (cell.columnId == SMARTSHEET.LAST_NAME_COLUMN) {
          recevier.lastname = cell.value;
        }
        if (cell.columnId == SMARTSHEET.OFFICE_COLUMN) {
          recevier.office = cell.value;
        }
      });
      return recevier;
    }
  }
};

const shuffle = async () => {
  try {
    var sheet = await smartsheet.sheets.getSheet({
      id: SMARTSHEET.SMARTSHEET_ID,
    });

    const participantEmails = [];
    sheet.rows.forEach((row) => {
      let email = undefined;
      let participate = false;
      row.cells.forEach((cell) => {
        if (cell.columnId == SMARTSHEET.EMAIL_ADDRESS_COLUMN) {
          email = cell.value;
        }
        if (
          cell.columnId == SMARTSHEET.PARTICIPATE_COLUMN &&
          cell.value == "Yes"
        ) {
          participate = true;
        }
        if (cell.columnId == SMARTSHEET.GIFT_RECEIVER_COLUMN && !!cell.value) {
          console.log(row);
          throw Error("Shuffling is only possible once!!!");
        }
      });
      if (participate && email) {
        participantEmails.push(email);
      }
    });

    let receiverEmail = [...participantEmails];

    console.log(receiverEmail.length);
    console.log(participantEmails.length);

    while (!checkValid(participantEmails, receiverEmail)) {
      receiverEmail = shuffleArray(receiverEmail);
    }

    sheet.rows.forEach(async (row) => {
      let index = -1;
      row.cells.forEach(async (cell) => {
        if (
          cell.columnId == SMARTSHEET.EMAIL_ADDRESS_COLUMN &&
          participantEmails.indexOf(cell.value) != -1
        ) {
          index = participantEmails.indexOf(cell.value);
        }
      });

      othercells = row.cells.filter(
        (cell) => cell.columnId != SMARTSHEET.GIFT_RECEIVER_COLUMN
      );
      receiverCell = {
        columnId: SMARTSHEET.GIFT_RECEIVER_COLUMN,
        value: receiverEmail[index],
        displayValue: receiverEmail[index],
      };
      row.cells = [...othercells, receiverCell];
      row = { id: row.id, cells: row.cells };
      try {
        let updated = false;
        while (!updated) {
          try {
            var response = await smartsheet.sheets.updateRow({
              sheetId: SMARTSHEET.SMARTSHEET_ID,
              body: row,
            });
            updated = true;
          } catch (error) {
            if (error.errorCode == 4004) {
              await new Promise((r) => setTimeout(r, 200));
            } else if (error.errorCode == 4003) {
              await new Promise((r) => setTimeout(r, 1000));
            } else {
              console.error(row);
              throw error;
            }
          }
          await new Promise((r) => setTimeout(r, 100));
        }
      } catch (error) {
        console.error(error);
        //console.log(row);
      }
    });
  } catch (error) {
    console.error(error.message);
    console.log(error);
  }
};

const checkValid = (participantEmails, receiverEmail) => {
  for (let i = 0; i < participantEmails.length; i++) {
    if (participantEmails[i] == receiverEmail[i]) {
      return false;
    }
  }
  return true;
};

const getAll = async () => {
  try {
    var sheet = await smartsheet.sheets.getSheet({
      id: SMARTSHEET.SMARTSHEET_ID,
    });

    const participantEmails = [];
    sheet.rows.forEach((row) => {
      let person = {};
      let participate = false;
      row.cells.forEach((cell) => {
        if (cell.columnId == SMARTSHEET.EMAIL_ADDRESS_COLUMN) {
          person.email = cell.value;
        }
        if (cell.columnId == SMARTSHEET.FIRST_NAME_COLUMN) {
          person.firstName = cell.value;
        }
        if (cell.columnId == SMARTSHEET.LAST_NAME_COLUMN) {
          person.lastName = cell.value;
        }
        if (cell.columnId == SMARTSHEET.GIFT_RECEIVER_COLUMN) {
          person.receiver = cell.value;
        }
        if (
          cell.columnId == SMARTSHEET.PARTICIPATE_COLUMN &&
          cell.value == "Yes"
        ) {
          participate = true;
        }
      });
      if (participate && person.email) {
        participantEmails.push(person);
      }
    });
    return participantEmails;
  } catch (error) {
    console.error(errror);
  }
};

const shuffleArray = (array) => {
  return array.slice().sort(() => Math.random() - 0.5);
};

const createExportFile = async () => {
  // Set options
  const options = {
    id: SMARTSHEET.SMARTSHEET_ID, // Id of Sheet
  };
  const filename = new Date().toDateString();

  // Get sheet
  return new Promise((res, rej) => {
    smartsheet.sheets
      .getSheetAsExcel(options)
      .then(function (fileContents) {
        // Write sheet to file
        fs.writeFile(
          `./data/${filename}.xlsx`,
          fileContents,
          "binary",
          (err) => {
            if (err) throw err;
            res(`./data/${filename}.xlsx`);
          }
        );
      })
      .catch(function (error) {
        console.log(error);
      });
  });
};

module.exports = {
  addOrUpdateEntry,
  createExportFile,
  findPersonToSendAGift,
  shuffle,
  getAll,
};
