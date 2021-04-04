var collections = require("../../Collection");
var db = require("../../adminDb");
var admin = require("../../admin");


const useExcessAmount = (change,context) =>{

    const currentInstData = change.after.data();
    const prevInstData = change.before.data();

    var available_Amount = calculateAvailableExcessAmount(currentInstData.receipt_usage);

    console.log("Installment no = ",currentInstData.auction_no);
    console.log("The available excess amount is ",available_Amount);


    if((available_Amount)<=0){
        console.log("There is no excess amount , val = ",available_Amount);
        return;
    }


    const dueInstQuery = db.collection(collections.installment)
                         .where("group_id","==",currentInstData.group_id)
                         .where("ticket_no","==",currentInstData.ticket_no)
                         .where("status","in",["due","part"])
                         .orderBy("generated_date","desc"); 

    const instDataRef = db.collection(collections.installment).doc(change.after.id);

    return dueInstQuery.get().then((snap)=>{
        return db.runTransaction((transaction)=>{
            return transaction.get(instDataRef).then((doc)=>{

                if(!doc.exists){
                    throw new Error("Installment Doesnt exist");
                }

                var transInstData = doc.data();

                available_Amount = calculateAvailableExcessAmount(transInstData.receipt_usage);

                if(available_Amount<=0){
                    throw new Error("No exccess Amount");
                }

                console.log("Available amount in transaction = ",available_Amount);
                
                console.log("Installment ID from transaction = ",doc.data().auction_no);

                var res = donateFunds(available_Amount,snap,transInstData.receipt_usage,transaction);

                let updatedReceiptUsage = res[0];
                let usedFunds = res[1];

                console.log("Total used funds in ",available_Amount," is ",usedFunds);

                let res1 = getAdvancePaidAndDonated(updatedReceiptUsage,transInstData);

                let advance_paid = res1[0] > 0 ? res1[0] : 0;
                let donated = res1[1] > 0 ? res1[0] : 0;

                console.log("Inst id = ",transInstData.auction_no," Advance paid = ",advance_paid," donated  = ",donated)

                let toUpdate = {
                    receipt_usage : updatedReceiptUsage,
                    donated,
                    advance_paid
                }

                transaction.update(instDataRef,toUpdate);
                return "success";
            })   
        }).then(()=>{
            console.log("Updated installment ",currentInstData.auction_no);
            return;
        }).catch((err)=>{throw err;})
    }).then(()=>{
        console.log("Excess Amount used succesfully");
        return;
    }).catch((err)=>{
        console.error(err);
        return;
    })

}

function donateFunds(available_amount,snap,receipt_usage,transaction){

    console.log("The snap size is ",snap.size);
    let used_funds = 0;

    snap.forEach((doc)=>{

        if(available_amount<=0){
            return;
        }

        let instData = doc.data();
        let instRef = db.collection(collections.installment).doc(doc.id);

        
        let requiredAmount = getRequiredAmount(instData);
        console.log("Required Amount = ",requiredAmount);

    
        if(requiredAmount>0){
            let available = (available_amount>=requiredAmount) ? requiredAmount : available_amount;
            used_funds = used_funds + available;
            available_amount = available_amount - available;
            console.log("Avaialable amount = ",available_amount," used_funds = ",used_funds," available = ",available," required Amount = ",requiredAmount);
            receipt_usage = processReceiptUsage(receipt_usage,available,instData.auction_no);
            console.log("Updating received inst id = ",doc.id);
            transaction.update(instRef,{
                accepted_from_other : admin.firestore.FieldValue.increment(available),
                total_paid : admin.firestore.FieldValue.increment(available),
            });
        }
    });

    return [receipt_usage,used_funds];

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

function getRequiredAmount(instData){
    return (
          (instData.installment_value - instData.dividend)
        - (instData.total_paid - (instData.donated))
        + (instData.interest - instData.waived_interest)
        + (instData.other_charges)
    );
}


function calculateAvailableExcessAmount(receipt_usage){
    let excess_amount = 0;

    receipt_usage.forEach((usage)=>{
        excess_amount += (usage.value - usage.total_used);  
    })
    return excess_amount;
}

function getAdvancePaidAndDonated(receipt_usage,inst_data){
    let advance_paid,donated = 0;
    let payable =   (inst_data.installment_value - inst_data.dividend) 
                  + (inst_data.other_charges) 
                  + (inst_data.interest - inst_data.waived_interest);

    var total_paid = inst_data.accepted_from_other;

    receipt_usage.forEach((usage)=>{
        total_paid += usage.value;
        donated += usage.total_used;
    });

    donated = donated - payable ; // cause donated will have this installment payable too

    advance_paid = total_paid - payable;

    return [advance_paid,donated];
    
}


module.exports = useExcessAmount;

