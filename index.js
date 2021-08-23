const accountSid = '';
const authToken = '';

const httpClient = require('./MyRequestClient');
const client = require('twilio')(accountSid, authToken, {
  httpClient: new httpClient(100000),
});

const fs = require('fs');
const phoneNumbers = require('./phoneNumbers');

const outputFileName = 'insert_query.sql'

const resources = [];
const CONTACT_CHUNK_SIZE = 200;
let sentCount = 0;
let retrievedCount = 0;
let phoneChunks = [];
let phonePosition = 0;

function prepareChunks() {
  while (phonePosition < phoneNumbers.length) {
    phoneChunks.push(phoneNumbers.slice(phonePosition, (phonePosition += CONTACT_CHUNK_SIZE)));
  }
}

function startProcess() {
  phoneChunks.reduce((currentPromise, phonesChunk, chunkIndex) => 
    currentPromise.then(() => {
      return Promise.all(phonesChunk.map(({phoneNumber}, i) => {
        sentCount++
        console.log('Sent: ', sentCount);
        return client.incomingPhoneNumbers
          .list({phoneNumber, limit: 1})
          .then(res => saveResource(chunkIndex, i, res));
      }))
    }), Promise.resolve([]))
    .then(() => writeFile(buildQuery()));
}

function buildQuery() {
  console.log('Building query...')
  const query = 'INSERT INTO _dev_track_customnumbers(user_id, event_type, phone_number, twilio_sid) VALUES';
  return resources.reduce((finalQuery, { userID, phoneNumber, sid }) => {
      const values = `(${userID}, 'buy', '${phoneNumber}', '${sid}')`;
    return (
`${finalQuery}
${values},`);
  }, query);
}

function writeFile(data) {
  console.log('Writing file...')
  fs.writeFileSync(outputFileName, data);
}

function saveResource(chunkIndex, index, data) {
  console.log('Saving...');
  data.forEach(({ sid }) => {
    retrievedCount++;
    console.log('Retrieved: ', retrievedCount);
    const { userID, phoneNumber } = phoneChunks[chunkIndex][index]
    resources.push({userID, phoneNumber, sid});
  })
}

prepareChunks();
startProcess();
