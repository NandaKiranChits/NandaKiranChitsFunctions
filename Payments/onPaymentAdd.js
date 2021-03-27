const admin = require("../admin");
const collection = require("../Collection");
const db  = require("../adminDb");
const addToDailySummary = require("../DailySummary/addToDailySummary");

const onPaymentAdd = (snap,context) =>{
    var paymentData = snap.data();
    var paymentRef = db.collection(collection.payments).doc(snap.id);

    return AssignPaymentID(paymentRef).then((id)=>{
        console.log("PAyment ID Assigned succesfullly");
        paymentData["payment_id"] = id;
        return addPaymentToInstallment(paymentData).then(()=>{
            return addToDailySummary(paymentData.payment_details.total_paid,paymentData.payment_details.payment_method).then(()=>{
                console.log("Updated in Daily Summary");
                return null;
            }).catch((err)=>{
                throw err;
            });
        })
        .catch((err)=>{
            throw err;
        })

    }).catch((err)=>{
        console.error(err.message);
        //add notification that payment data is deleted
        //paymentRef.delete();
    })
}

const addPaymentToInstallment = (paymentData) =>{
    var instID = paymentData.group_id + "-" + paymentData.inst_details.inst_no + "-" + paymentData.ticket_no;
    const installmentRef = db.collection(collection.installment).doc(instID);

    return db.runTransaction((transaction)=>{
        return transaction.get(installmentRef).then((doc)=>{
            if(!doc.exists){
                throw new Error("Installment Not Found");
            }
            var installmentData = doc.data();
            var groupCustID = installmentData.group_id +"-"+installmentData.ticket_no;
            var groupCustRef = db.collection(collection.groupCustomer).doc(groupCustID); 
            
            //inst status will be updated by other function
            var toUpdateInst = {
                receipt_ids : admin.firestore.FieldValue.arrayUnion(paymentData.payment_id),
                total_paid  : admin.firestore.FieldValue.increment(paymentData.payment_details.total_paid),
            }
            var toUpdateCust = {
                account_balance : admin.firestore.FieldValue.increment(paymentData.payment_details.total_paid),
                total_amount_paid : admin.firestore.FieldValue.increment(paymentData.payment_details.total_paid),
            }
            transaction.update(installmentRef,toUpdateInst);
            transaction.update(groupCustRef,toUpdateCust);
            return "done";
        })
    });
}


const AssignPaymentID = (paymentRef) => {
    var query = db.collection(collection.payments).orderBy("payment_id","desc").limit(1);
    return db.runTransaction((transaction)=>{
        return transaction.get(query).then((snap)=>{
            console.log("Payments got = ",snap.size);
            var newID = 1;
            snap.forEach((doc)=>{
                newID = doc.data().payment_id + 1;
            });

            transaction.update(paymentRef,{payment_id:newID});
            return newID;
        })
    }).then((newID)=>{
        console.log("Payment ID Assigned");
        return newID;
    }).catch((err)=>{
        console.error(err);
        throw err;
    })
}

module.exports = onPaymentAdd;