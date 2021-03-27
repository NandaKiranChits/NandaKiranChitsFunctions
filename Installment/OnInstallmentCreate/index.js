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

                let lastReceiptID = subInstData.receipt_ids.length===0? null:subInstData.receipt_ids.pop();

                if(amount_available>=required_amount){
                    available = required_amount;
                }
                else if(amount_available < required_amount){
                    available = amount_available;
                }

                amount_gathered = amount_gathered + available;

                transaction.update(subInstref,{
                    donated : admin.firestore.FieldValue.increment(available),
                    contributed_to : admin.firestore.FieldValue.arrayUnion({receipt_id : lastReceiptID,
                                                                            amount : available,
                                                                            installment_id : instData.auction_no,})
                    })
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


module.exports = onInstallmentCreate;