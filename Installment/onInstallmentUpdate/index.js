const processUpdateStatus = require("./ProcessUpdateStatus");
const processExcessAmount = require("./ProcessExcessAmount");

const onInstallmentUpdate = (change,context) =>{
    var beforeData = change.before.data();
    var instData = change.after.data();

    //update inst status

    if(beforeData.total_paid !== instData.total_paid){ // only if the payment is added
        return processUpdateStatus(instData,change.after.id);
    }   
    
    if(beforeData.advance_paid < instData.advance_paid){ // if the advance paid has increased
        let excess_amount = instData.advance_paid - instData.donated;
        if(excess_amount>0){
            return processExcessAmount(change.after.id,instData);
        }
    }

    if(beforeData.waived_interest < instData.waived_interest){
        return processUpdateStatus(instData,change.after.id);
    }

    if(beforeData.other_charges < instData.other_charges){
        return processUpdateStatus(instData,change.after.id);
    }


    return "";
    
}

module.exports = onInstallmentUpdate;