const processUpdateStatus = require("./ProcessUpdateStatus");
const processExcessAmount = require("./ProcessExcessAmount");

const onInstallmentUpdate = (change,context) =>{
    var beforeData = change.before.data();
    var instData = change.after.data();

    //update inst status

    var updateStatus = false;

    if(beforeData.total_paid !== instData.total_paid){ // only if the payment is added
        updateStatus = true;
    }  
    
    if((instData.advance_paid-instData.donated) > 0){
        return processExcessAmount(change.after.id,instData);
    }

    if(beforeData.waived_interest < instData.waived_interest){
        updateStatus = true;
    }

    if(beforeData.other_charges < instData.other_charges){
        updateStatus = true;
    }

    if(updateStatus){
        processUpdateStatus(instData,change.after.id);
    }

    return processExcessAmount(change.after.id,instData); // just to make sure everything is taken care
    
}

module.exports = onInstallmentUpdate;