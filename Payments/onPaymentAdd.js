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
                receipt_usage : admin.firestore.FieldValue.arrayUnion(processReceiptUsage(paymentData,installmentData)),
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

function processReceiptUsage(paymentData,instData){
    let inst_no = instData.auction_no;
    let total_paid = paymentData.payment_details.total_paid;

    let receipt_usage = {payment_id:paymentData.payment_id,value:total_paid,total_used:0,used_in:[]};

    let payable = (instData.installment_value - instData.dividend + instData.other_charges + (instData.interest - instData.waived_interest )) - (instData.total_paid);  

    let used = 0;
    if(payable>0){
        if(total_paid <= payable){
            used = total_paid;
        }
        else if(total_paid > payable){
            used = payable;
        }
    }
    if(used>0){
        receipt_usage["total_used"] = receipt_usage["total_used"] + used;
        receipt_usage["used_in"].push({inst_no,used});
    }
    
    return receipt_usage;
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