const admin = require("../admin");
const collection = require("../Collection");
const db  = require("../adminDb");


const cancelPayment = (snap,context) =>{
    let payment_data = snap.data();

    let {payment_id,status,ticket_no,group_id}= payment_data;
    let inst_no = payment_data.inst_details.inst_no;
    let total_paid = payment_data.payment_details.total_paid;

    let inst_doc_id = group_id + "-" + inst_no + "-" + ticket_no;
    let instRef = db.collection(collections.installment).doc(inst_doc_id);

    


}

module.exports = cancelPayment;