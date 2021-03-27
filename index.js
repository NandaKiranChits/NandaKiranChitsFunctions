const functions = require('firebase-functions');
const CollectionNames = require("./Collection");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const OnGroupAdd = require("./onGroupAdd/index");
const onAuctionUpdate = require("./Auction/onAuctionUpdate");
const onGroupCustomerCreate = require("./GroupCustomer/onGroupCustomerCreate");
const scheduledInterestAssigner = require("./CronTasks/InterestAssigner");
const onPaymentAdd = require("./Payments/onPaymentAdd");
const onInstallmentUpdate = require("./Installment/onInstallmentUpdate/index");
const onInstallmentCreate = require("./Installment/OnInstallmentCreate/index");

/*

IMPORTANT NOTES:

1.Interest will be added to account balance


*/


exports.onGroupAdd = functions.firestore.document(`${CollectionNames.group}/{group_name}`).onCreate(OnGroupAdd);
exports.onAuctionUpdate  = functions.firestore.document(`${CollectionNames.auction}/{auction_id}`).onUpdate(onAuctionUpdate);
exports.onGroupCustomerCreate = functions.firestore.document(`${CollectionNames.groupCustomer}/{ticket_id}`).onCreate(onGroupCustomerCreate);
exports.onInstallmentUpdate = functions.firestore.document(`${CollectionNames.installment}/{auction_no}`).onUpdate(onInstallmentUpdate);
exports.onInstallmentCreate = functions.firestore.document(`${CollectionNames.installment}/{auction_no}`).onCreate(onInstallmentCreate);

exports.onPaymentAdd = functions.firestore.document(`${CollectionNames.payments}/{payment_id}`).onCreate(onPaymentAdd);

exports.scheduledInterestAssigner = functions.pubsub.schedule("every day 00:16").timeZone("Asia/Kolkata").onRun(scheduledInterestAssigner);