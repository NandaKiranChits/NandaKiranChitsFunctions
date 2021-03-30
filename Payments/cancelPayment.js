const admin = require("../admin");
const collection = require("../Collection");
const db  = require("../adminDb");


const cancelPayment = (change,context) =>{
    let payment_before_data = change.before.data();
    let payment_data = change.after.data();

    if(payment_before_data.status==="success" && payment_data.status!=="failure"){
        console.log("Payment Status is not success");
        return;
    }

    console.log("PAyment document id = ",change.after.id," change.after = ",change.after);

    let paymentDataRef = db.collection(collection.payments).doc(change.after.id);

    let {payment_id,ticket_no,group_id}= payment_data;
    let inst_no = payment_data.inst_details.inst_no;

    let inst_doc_id = group_id + "-" + inst_no + "-" + ticket_no;
    let instRef = db.collection(collection.installment).doc(inst_doc_id);

    return db.runTransaction((transaction)=>{
        return transaction.get(instRef).then((doc)=>{
            if(!doc.exists){
                throw new Error("Installment Not Found");
            }
            let instData = doc.data();
            let receipt_usage = instData.receipt_usage;
            transaction.update(paymentDataRef,{receipt_ids  : admin.firestore.FieldValue.arrayRemove(payment_id)});

            withdrawFunds(receipt_usage,payment_id,instData,inst_no,group_id,ticket_no,transaction);
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
}


module.exports = cancelPayment;