const db = require("../adminDb");
const admin = require("../admin");
const collectionNames = require("../Collection");

const InterestAssigner = (context) =>{
    var installmentQuery = db.collection(collectionNames.installment)
                             .where("status","in",["due","part"])
                             .where("due_date","<",(new Date()));


    console.log("Running Cron Task at 12:16AM");

    return db.runTransaction((transaction)=>{
        return transaction.get(installmentQuery).then((snap)=>{
            snap.forEach((doc)=>{

                let inst_data = doc.data();
                let payable = (inst_data.installment_value - inst_data.dividend - inst_data.total_paid - (inst_data.interest -inst_data.waived_interest));
                let instRef = db.collection(collectionNames.installment).doc(doc.id);
                let interest = parseInt(calcInterest(inst_data.due_date.toDate(),payable,inst_data.interestRate));

                let groupCustRef = db.collection(collectionNames.groupCustomer).doc(inst_data.group_id+"-"+inst_data.ticket_no);

                transaction.update(instRef,{interest});
                transaction.update(groupCustRef,{account_balance:admin.firestore.FieldValue.increment(-interest)});
            });
            return "done";
        })
    }).then(()=>{
        console.log("Updated Interest");
        return;
    }).catch((err)=>{
        //if error in interest Assigner send notification to vinay
        console.error(err);
        return;
    })
    
}

function calcInterest(due_date,payable,interestRate){

    let interestPerYear = (interestRate/100) * payable;
    let interestPerDay = interestPerYear/365;
    const today = new Date();
    const diffTime = Math.abs(today - due_date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return (diffDays * interestPerDay);
}


module.exports = InterestAssigner;
