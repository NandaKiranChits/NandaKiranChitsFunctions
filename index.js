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
const onPaymentAdd = require("./Payments/onPaymentAdd/onPaymentAdd");
const updateStatusOnInstallmentUpdated = require("./Installment/onInstallmentUpdate/updateStatus");
const useExcessAmountOnInstUpdated = require("./Installment/onInstallmentUpdate/useExcessAmount");
const onInstallmentCreate = require("./Installment/OnInstallmentCreate/index");
const CancelPayment = require("./Payments/cancelPayment");
const onVoucherAdd = require("./Voucher/onVoucherAdd/index");


const stripeCreatePaymentIntent = require("./StripeNZClient/create-payment-intent");
const paymentWebhook = require('./StripeNZClient/paymentWebhook');



/*

IMPORTANT NOTES:

1.Interest will be added to account balance


*/


exports.onAuctionUpdate  = functions.firestore.document(`${CollectionNames.auction}/{auction_id}`).onUpdate(onAuctionUpdate);

exports.onGroupAdd = functions.firestore.document(`${CollectionNames.group}/{group_name}`).onCreate(OnGroupAdd);

exports.onGroupCustomerCreate = functions.firestore.document(`${CollectionNames.groupCustomer}/{ticket_id}`).onCreate(onGroupCustomerCreate);

exports.onInstallmentCreate = functions.firestore.document(`${CollectionNames.installment}/{auction_no}`).onCreate(onInstallmentCreate);
exports.updateStatusOnInstallmentUpdated = functions.firestore.document(`${CollectionNames.installment}/{auction_no}`).onUpdate(updateStatusOnInstallmentUpdated);
exports.useExcessAmountOnInstUpdated = functions.firestore.document(`${CollectionNames.installment}/{auction_no}`).onUpdate(useExcessAmountOnInstUpdated);

exports.onPaymentAdd = functions.firestore.document(`${CollectionNames.payments}/{payment_id}`).onCreate(onPaymentAdd);
exports.onPaymentCancel = functions.firestore.document(`${CollectionNames.payments}/{payment_id}`).onUpdate(CancelPayment);

exports.onVoucherAdd = functions.firestore.document(`${CollectionNames.voucher}/{voucher_no}`).onCreate(onVoucherAdd);

exports.scheduledInterestAssigner = functions.pubsub.schedule("every day 00:16").timeZone("Asia/Kolkata").onRun(scheduledInterestAssigner);



exports.createStripePaymentIntent = functions.https.onRequest(stripeCreatePaymentIntent);
exports.paymentWebhook = functions.https.onRequest(paymentWebhook);