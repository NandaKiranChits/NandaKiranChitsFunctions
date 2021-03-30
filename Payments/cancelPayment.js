const admin = require("../admin");
const collection = require("../Collection");
const db  = require("../adminDb");
const removeFromDailySummary = require("../DailySummary/removeFromDailySummary");
const processExcessAmount = require("../Installment/onInstallmentUpdate/ProcessExcessAmount");
const processUpdateStatus = require("../Installment/onInstallmentUpdate/ProcessUpdateStatus");

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
            withdrawFunds(receipt_usage,instData,paymentAmount,transaction);
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


function withdrawFunds(receipt_usage,instData,paymentAmount,transaction){
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
            receipt_usage[i].total_used = receipt_usage[i].total_used - used_amount;
        })
    }
    console.log("Payment Amount = ",paymentAmount);
    var toUpdate = {
        total_paid : admin.firestore.FieldValue.increment(-paymentAmount),
        advance_paid : ((instData.total_paid - paymentAmount) > payable) ? instData.total_paid - payable : 0,
        receipt_usage : [],
        donated : 0,
    }
    transaction.update(root_instRef,toUpdate);
}

/*
function withdrawFunds(receipt_usage,payment_id,rootInstData,inst_id,group_id,ticket_id,transaction){

    let root_inst_doc_id = group_id + "-" + inst_id + "-" + ticket_id;
    let receipt_usage_data = null;
    receipt_usage.forEach((doc)=>{
        if(doc["payment_id"]===payment_id){
            receipt_usage_data = doc;
        }
    })

    if(receipt_usage_data === null){
        console.log("Receipt usage data not found");
        return;
    }

    if(receipt_usage_data.total_used===0){
        console.log("Receipt is not used");
        processFund(root_inst_doc_id,receipt_usage_data,rootInstData,transaction);
        return;
    }

    let used_in = receipt_usage_data.used_in;

    used_in.forEach((usage_det)=>{
        let usedInstID = usage_det.inst_no;
        let usedAmount = usage_det.used;

        let donated_inst_doc_id = group_id + "-" + usedInstID + "-" + ticket_id;
        let ref  = db.collection(collection.installment).doc(donated_inst_doc_id);
        if(usedInstID!==inst_id){
                let toUpdate = {
                    accepted_from_other:admin.firestore.FieldValue.increment(-usedAmount),
                    total_paid:admin.firestore.FieldValue.increment(-usedAmount)
                };
                transaction.update(ref,toUpdate);
        }
    });

    processFund(root_inst_doc_id,receipt_usage_data,rootInstData,transaction);
    
}


function processFund(root_inst_doc_id,receipt_usage_data,inst_data,transaction){

    let value = receipt_usage_data.value;

    var toUpdate = {
        total_paid : admin.firestore.FieldValue.increment(-value),
        receipt_usage : admin.firestore.FieldValue.arrayRemove(receipt_usage_data)
    };
    if(inst_data.advance_paid>=value){
        toUpdate["advance_paid"] = admin.firestore.FieldValue.increment(-value);
    }
    else if(inst_data.advance_paid<value && inst_data.advance_paid>0){
        toUpdate["advance_paid"] = admin.firestore.FieldValue.increment(-inst_data.advance_paid);
    }
    if(inst_data.donated>=value){
        toUpdate["donated"] = admin.firestore.FieldValue.increment(-value);
    }
    else if(inst_data.donated < value && inst_data.donated>0){
        toUpdate["donated"] = admin.firestore.FieldValue.increment(-inst_data.donated);
    }
    var ref = db.collection(collection.installment).doc(root_inst_doc_id);
    transaction.update(ref,toUpdate);
    return;
}*/


module.exports = cancelPayment;