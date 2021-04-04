const admin = require("../../admin");
const db = require("../../adminDb");
const CollectionNames = require("../../Collection");

const onInstallmentCreate = (snap,context) =>{
    var instData = snap.data();

    var instRef = db.collection(CollectionNames.installment).doc(snap.id);
    var query = db.collection(CollectionNames.installment)
                  .where("group_id","==",instData.group_id)
                  .where("ticket_no","==",instData.ticket_no)
                  .where("advance_paid",">",0);

    return db.runTransaction((transaction)=>{
        return transaction.get(query).then((snap)=>{

            var required_amount = getPayable(instData);

            var amount_gathered = 0;

            snap.forEach((doc)=>{
                if(required_amount===0){
                    return;
                }
                var subInstData = doc.data();
                var subInstref = db.collection(CollectionNames.installment).doc(doc.id);
                var amount_available = (subInstData.advance_paid - subInstData.donated);
                var available = 0;

                //let lastReceiptID = subInstData.receipt_ids.length===0? null:subInstData.receipt_ids.pop();

                if(amount_available>=required_amount){
                    available = required_amount;
                }
                else if(amount_available < required_amount){
                    available = amount_available;
                }   

                amount_gathered = amount_gathered + available;

                console.log("Amount Gathered = ",amount_gathered," took value from inst ",instData.auction_no," of rupees ",available);

                var receipt_usage = processReceiptUsage(subInstData.receipt_usage,available,instData.auction_no);
                if(available>0){
                    transaction.update(subInstref,{
                        donated : admin.firestore.FieldValue.increment(available),
                        receipt_usage,
                    });
                }
            });


                transaction.update(instRef,{
                                     total_paid : admin.firestore.FieldValue.increment(amount_gathered),
                                     accepted_from_other : admin.firestore.FieldValue.increment(amount_gathered)
                                });
            
            

            return "success";
        })
    }).then(()=>{
        console.log("Succesfully Completed onInstallment Create Rituals");
        return;
    }).catch((err)=>{
        console.error(err);
        return;
    })

}   

function getPayable(instData){
    let total_payable = ((instData.installment_value - instData.dividend)  
                        + instData.other_charges 
                        + (instData.interest - instData.waived_interest) 
                        - (instData.accepted_from_other+instData.total_paid));
    return total_payable;
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
    receipt_usage.forEach((usage)=>{
        console.log(usage);
        console.log(usage.used_in);
    })
    return receipt_usage;
}


module.exports = onInstallmentCreate;