var collections = require("../../Collection");
var db = require("../../adminDb");

const onInstallmentUpdateChangeStatus = (change,context) =>{
    let currentInstData = change.after.data();
    let prevInstData = change.before.data();


    if((currentInstData.total_paid===prevInstData.total_paid) && // total paid will be increased when accepted_from_other increases
       (currentInstData.waived_interest===prevInstData.waived_interest) &&
       (currentInstData.other_charges===prevInstData.other_charges)
    ){
        console.log("No changes observerd");
        return;
    }

    let instRef = db.collection(collections.installment).doc(change.after.id);

    var total_payable = ((currentInstData.installment_value - currentInstData.dividend)  + currentInstData.other_charges + (currentInstData.interest - currentInstData.waived_interest));
    console.log("Total Payable = ",total_payable);
    //total paid will already contain every incoming source including payment_receieved from other installments
    var total_paid = (currentInstData.total_paid ) - (currentInstData.donated); 
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
    
    total_paid = total_paid - currentInstData.accepted_from_other; // eliminate amount from other installments
    var advance_paid = (total_paid > total_payable) ? (total_paid - total_payable)  : 0;

    console.log("Updating status as ",status);

    currentInstData["advance_paid"] = advance_paid;
    currentInstData["status"] = status;

    console.log("Updating advance paid ",advance_paid," total paid = ",total_paid," payab;e = ",total_payable," accepted from other =",currentInstData.accepted_from_other);

    return instRef.update(currentInstData).then(()=>{
        console.log("Status updated succesfully");
        return;
    }).catch((err)=>{
        console.error(err);
        return;
    })    

}

module.exports = onInstallmentUpdateChangeStatus;