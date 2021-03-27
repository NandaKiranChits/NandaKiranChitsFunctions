const db = require("../../adminDb");
const admin = require("../../admin");
var collections = require("../../Collection");

const processExcessAmount = (inst_doc_id,instData) =>{
    var instRef = db.collection(collections.installment).doc(inst_doc_id);
    var dueInstQuery = db.collection(collections.installment)
                         .where("group_id","==",instData.group_id)
                         .where("ticket_no","==",instData.ticket_no)
                         .where("status","in",["due","part"])
                         .orderBy("generated_date","desc"); 
    
    console.log("Group id = ",instData.group_id," ticket no = ",instData.ticket_no," query - ",dueInstQuery);

    return db.runTransaction((transaction)=>{
        return transaction.get(dueInstQuery).then((snap)=>{

            var excess_amount = instData.advance_paid - instData.donated;
            let lastReceiptID = instData.receipt_ids.length===0 ? null : instData.receipt_ids.pop();

            console.log("The excess amount available is ",excess_amount);

            if(excess_amount<=0){
                throw new Error("There is no excess amount");
            }

            var result = processInstallments(snap,transaction,excess_amount,lastReceiptID); // run only once

            var logs = result[0];
            var donated = (excess_amount - result[1]);
            var contributed_to = instData.contributed_to;

            logs.forEach((log)=>{
                contributed_to.push(log);
            });

            transaction.update(instRef,{contributed_to,donated:admin.firestore.FieldValue.increment(donated)});
            
            return "success";
        })
    }).then(()=>{
        console.log("Succesfully used Excess Amount");
        return;
    }).catch((err)=>{
        console.error(err);
        return;
    })

}



function processInstallments(snap,transaction,excess_amount,lastReceiptID){
    var logs = [];


    console.log("Size of snap is ",snap.size)

    snap.forEach((doc)=>{
        if(excess_amount===0){
            return;
        }
        let subinstData = doc.data();
        let subinstRef = db.collection(collections.installment).doc(doc.id);
        let payable = getPayable(subinstData);
        let available = 0;

        console.log("Excess amount is used for insllment",subinstData.auction_no);
        
        if(excess_amount>=payable){
            available = payable;
        }
        else{
            available = excess_amount;
        }

        excess_amount = excess_amount - available;
        
        let toUpdate = {
            total_paid : admin.firestore.FieldValue.increment(payable),
            accepted_from_other : admin.firestore.FieldValue.increment(payable),
        }
        transaction.update(subinstRef,toUpdate);
        logs.push({
                receipt_id : lastReceiptID,
                amount : payable,
                installment_id : subinstData.auction_no,
        });
        
        
    });

    return [logs,excess_amount];
}


function getPayable(instData){
    let total_payable = ((instData.installment_value - instData.dividend)  
                        + instData.other_charges 
                        + (instData.interest - instData.waived_interest) 
                        - (instData.accepted_from_other+instData.total_paid));
    return total_payable;
}


module.exports = processExcessAmount;