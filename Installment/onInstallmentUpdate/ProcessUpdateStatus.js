const db = require("../../adminDb");
var collections = require("../../Collection");

const processUpdateStatus = (instData,documentID) =>{
    let updatedInstData = processInstallment(instData);
    let instRef = db.collection(collections.installment).doc(documentID);

    return instRef.update(updatedInstData).then(()=>{
        console.log("Status updated succesfully");
        return;
    }).catch((err)=>{
        console.error(err);
        return;
    })    
}

const processInstallment = (instData) =>{
    var total_payable = ((instData.installment_value - instData.dividend)  + instData.other_charges + (instData.interest - instData.waived_interest));
    
    console.log("Total Payable = ",total_payable);
    
    //total paid will already contain every incoming source
    var total_paid = (instData.total_paid ) - (instData.advance_paid-instData.donated); 
    console.log("total Paid = ",total_paid);

    
    let status = null;
    if(total_paid >= total_payable){
        status = "paid";
    }
    else if((total_paid>0) && (total_paid<total_payable)){
        status = "part";
    }
    else{
        status = "due";
    }
    
    total_paid = total_paid - instData.accepted_from_other; // eliminate amount from other installments
    var advance_paid = (total_paid > total_payable) ? (total_paid - total_payable)  : 0;

    console.log("Updating status as ",status);

    instData["advance_paid"] = advance_paid;
    instData["status"] = status;

    return instData;
}



module.exports = processUpdateStatus;