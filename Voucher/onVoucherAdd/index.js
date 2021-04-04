const db = require("../../adminDb");
const admin = require("../../admin");
const collections = require("../../Collection");

const onVoucherAdd = (snap,context) =>{
    const voucherData = snap.data();

    const voucherRef = db.collection(collections.voucher).doc(snap.id);

    let {group_id,ticket_no,amount,type,date} = voucherData; 

    let instQuery = db.collection(collections.installment)
                      .where("group_id","==",group_id)
                      .where("ticket_no","==",ticket_no)
                      .orderBy("auction_no","desc")
                      .limit(1);

    let custRef = db.collection(collections.groupCustomer).doc(group_id+"-"+ticket_no);


    return AssignVoucherID(voucherRef).then((voucher_id)=>{
        console.log("Voucher ID added succesfully");
        let updatableAmount = (type==="DEBIT"?(-amount):amount);

        if((voucherData.type!=="DEBIT") && (voucherData.type!=="CREDIT")){
            console.log("Status is not debit or credit it is ",voucherData.type);
            console.log("Matching = ",(voucherData.type!=="DEBIT"));
            return;
        }

        return addAmountToLatestInstallment(instQuery,custRef,updatableAmount,voucher_id,date.toDate()).then(()=>{
            console.log("Amount Added To Installment Succesfully");
            return;
        }).catch((err)=>{
            console.error(err);
            throw err;
        })
        
    })
    .catch((err)=>{
        console.error(err);
        
    })


}

const addAmountToLatestInstallment = (query,custRef,amount,voucher_no,date)=>{
    return db.runTransaction((transaction)=>{
        return transaction.get(query).then((snap)=>{
            
            let instDocId = null;

            snap.forEach((doc)=>{
                instDocId = doc.id;
            });

            console.log("Installment Doc id = ",instDocId);

            var instRef = db.collection(collections.installment).doc(instDocId);

            let toUpdate = {
                other_charges:admin.firestore.FieldValue.increment(-amount),  // minus to reverse debit or credit sent by caller
                other_charges_details: admin.firestore.FieldValue.arrayUnion({voucher_no,amount:-amount,date})
            };
            
            transaction.update(instRef,toUpdate);
            transaction.update(custRef,{account_balance : admin.firestore.FieldValue.increment(amount)});
            
            return;
        })
    }).then(()=>{
        console.log("Voucher Added Succesfully");
        return;
    }).catch((err)=>{
        console.error(err);
        throw err;
    })
}

const AssignVoucherID = (voucherRef) =>{

    var query = db.collection(collections.voucher).orderBy("voucher_no","desc").limit(1);

    return db.runTransaction((transaction)=>{
        return transaction.get(query).then((snap)=>{
            let newID = 1;
            snap.forEach((doc)=>{
                newID = doc.data().voucher_no + 1;
            })
            transaction.update(voucherRef,{voucher_no:newID});
            return newID;
        })
    }).then((new_id)=>{
        console.log("Voucher ID assigned");
        return new_id;
    }).catch((err)=>{
        console.error(err);
        throw err;
    })
}

module.exports = onVoucherAdd;