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
    

    return db.runTransaction((transaction)=>{
        return transaction.get(dueInstQuery).then((snap)=>{

            var excess_amount = instData.advance_paid - instData.donated;
            let receipt_usage = instData.receipt_usage;

            console.log("The excess amount available is ",excess_amount);

            if(excess_amount<=0){
                throw new Error("There is no excess amount");
            }

            var result = processInstallments(snap,transaction,excess_amount,receipt_usage); // run only once

            var donated = (excess_amount - result[0]);
            receipt_usage = result[1];

            transaction.update(instRef,{donated:admin.firestore.FieldValue.increment(donated),receipt_usage});
            
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



function processInstallments(snap,transaction,excess_amount,receipt_usage){
   


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

        if(payable <= 0 ){
            return;
        }

        if(excess_amount>=payable){
            available = payable;
        }
        else{
            available = excess_amount;
        }

        console.log("USing ",available, " Amount in the installment");

        
        if(available>0){  // just to make sure negative values are not considered

            excess_amount = excess_amount - available;

            receipt_usage = processReceiptUsage(receipt_usage,available,subinstData.auction_no);

            let toUpdate = {
                total_paid : admin.firestore.FieldValue.increment(available),
                accepted_from_other : admin.firestore.FieldValue.increment(available),
            };

            transaction.update(subinstRef,toUpdate);
        }
    });

    return [excess_amount,receipt_usage];
}

function processReceiptUsage(receipt_usage,used_amount,inst_no){
    for(let i=0;i<receipt_usage.length;i++){
        let available = receipt_usage[i].value - receipt_usage[i].total_used;
        if(available>0){
            let using = 0;
            if(available<=used_amount){
                using = used_amount;
            }
            else{
                using = available;
            }
            used_amount = used_amount - using;
            receipt_usage[i].total_used = receipt_usage[i].total_used + using;
            receipt_usage[i].used_in.push({inst_no,used:using});
            if(used_amount===0){
                break;
            }
        }
    }
    console.log("Receipt usage ",receipt_usage);
    return receipt_usage;
}


function getPayable(instData){
    let total_payable = ((instData.installment_value - instData.dividend)  
                        + instData.other_charges 
                        + (instData.interest - instData.waived_interest) 
                        - (instData.accepted_from_other+instData.total_paid));
    return total_payable;
}


module.exports = processExcessAmount;