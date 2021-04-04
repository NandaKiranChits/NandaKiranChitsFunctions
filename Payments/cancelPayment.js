const admin = require("../admin");
const collection = require("../Collection");
const db  = require("../adminDb");
const removeFromDailySummary = require("../DailySummary/removeFromDailySummary");

// (peednas akihsnav) - read it from string.length to 0 , nobody's gonna find it hopefully. This is like an open locker, yet you only need experts. 

const cancelPayment = (change,context) =>{
    let before_payment_data = change.before.data();
    let payment_data = change.after.data();

    if(before_payment_data.status!=="success"){
        console.log("Before Payment Status is not success");
        return;
    }
    if(payment_data.status!=="failure"){
        console.log("Payment Status is not success");
        return;
    }

    let paymentDataRef = db.collection(collection.payments).doc(change.after.id);

    let {payment_id,ticket_no,group_id}= payment_data;
    let inst_no = payment_data.inst_details.inst_no;
    let paymentAmount = payment_data.payment_details.total_paid;

    let inst_doc_id = group_id + "-" + inst_no + "-" + ticket_no;
    let instRef = db.collection(collection.installment).doc(inst_doc_id);

    let groupCustID = group_id + "-" + ticket_no;
    let groupCustRef = db.collection(collection.groupCustomer).doc(groupCustID);

    let toUpdateCust = {
        account_balance : admin.firestore.FieldValue.increment(-paymentAmount),
        total_amount_paid : admin.firestore.FieldValue.increment(-paymentAmount),
    }

    return groupCustRef.update(toUpdateCust).then(()=>{
        return performCancelPaymentRituals(paymentDataRef,instRef,payment_id,paymentAmount).then(()=>{
            console.log("completed cancelPaymentRituals");
            return removeFromDailySummary((-payment_data.payment_details.total_paid),payment_data.date.toDate(),payment_data.payment_details.payment_method).then(()=>{
                console.log("Daily Summary updated succcesfully");
                return;
            })
            .catch((err)=>{
                console.error(err);
                return;
            })
        }).catch((err)=>{
            console.error(err);
            return ;
        })
    }).catch((err)=>{
        console.error(err);
        return;
    })


}


function performCancelPaymentRituals(paymentDataRef,instRef,payment_id,paymentAmount){
    return db.runTransaction((transaction)=>{
        return transaction.get(instRef).then((doc)=>{
            if(!doc.exists){
                throw new Error("Installment Not Found");
            }
            let instData = doc.data();
            let receipt_usage = instData.receipt_usage;
            transaction.update(instRef,{receipt_ids  : admin.firestore.FieldValue.arrayRemove(payment_id)});
            withdrawFunds(receipt_usage,instData,paymentAmount,transaction,payment_id);
            return "success";
        })
    }).then(()=>{
        console.log("Payment Cancelled and funds withdrawn succcesfully");
        return;
    }).catch((err)=>{
        console.error(err);
        paymentDataRef.collection({status:"success"}); // rollback
        return;
    })
}


function withdrawFunds(receipt_usage,instData,paymentAmount,transaction,payment_id){
    let inst_id = instData.auction_no;
    let group_id = instData.group_id;
    let ticket_no = instData.ticket_no;
    let payable = (instData.installment_value-instData.dividend - instData.accepted_from_other) 
                   + instData.other_charges 
                   + (instData.interest- instData.waived_interest );

    let root_instID = group_id + "-" + inst_id + "-" + ticket_no;
    let root_instRef = db.collection(collection.installment).doc(root_instID);

    for(var i=0;i<receipt_usage.length;i++){
        receipt_usage[i].used_in.forEach((inst_usage_det)=>{
        
            let benefited_inst_id = inst_usage_det.inst_no;
            let used_amount = inst_usage_det.used;

            if(benefited_inst_id === inst_id){
                return;
            }

            console.log("Inst id = ",benefited_inst_id," used amount= ",used_amount);
            let benefited_doc_id = group_id + "-" + benefited_inst_id + "-" + ticket_no;
            console.log("enefited doc id = ",benefited_doc_id);
            let benefited_db_ref = db.collection(collection.installment).doc(benefited_doc_id);
            let toUpdate = {
                accepted_from_other : admin.firestore.FieldValue.increment(-used_amount),
                total_paid : admin.firestore.FieldValue.increment(-used_amount),
            }
            transaction.update(benefited_db_ref,toUpdate);
        })
        receipt_usage[i].used_in = [];
        receipt_usage[i].total_used = 0;
    }
    console.log("Payment Amount = ",paymentAmount);
    let advance_paid = ((instData.total_paid - paymentAmount) > payable) ? (instData.total_paid-paymentAmount) - payable : 0;
    console.log("total Paid = ",instData.total_paid);
    console.log("Payable = ",payable);
    console.log("Advance paid = ",advance_paid);
    
    var toUpdate = {
        total_paid : admin.firestore.FieldValue.increment(-paymentAmount),
        advance_paid,
        receipt_usage : processReceiptUsage(removeFromReceiptUsage(payment_id,receipt_usage),payable,instData.auction_no),
        donated : 0,
    }
    transaction.update(root_instRef,toUpdate);
}

function processReceiptUsage(receipt_usage,used_amount,inst_no){
    for(let i=0;i<receipt_usage.length;i++){
        let available = receipt_usage[i].value - receipt_usage[i].total_used;
        if(available>0){
            let using = (available>=used_amount) ? used_amount : available ;
            used_amount = used_amount - using;
            receipt_usage[i].total_used = receipt_usage[i].total_used + using;
            receipt_usage[i].used_in.push({inst_no,used:using});
            if(used_amount===0){
                break;
            }
        }
    }
    return receipt_usage;
}



function removeFromReceiptUsage(payment_id,receipt_usage){
    let newArr = []

    receipt_usage.forEach((usage)=>{
        if(usage.payment_id!==payment_id){
            newArr.push(usage);
        }
    })

    return newArr;
}


module.exports = cancelPayment;