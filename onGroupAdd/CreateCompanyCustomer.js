var db = require("../adminDb");
var collectionRef = require("../Collection");
var admin = require("../admin");

function createCompanyCustomer(group_id,ticket_no){
    var data = { 
        name : "NandaKiran Chits Pvt Ltd",
        father_husband_name : "Propreitor NandaKiran Chits",
        DOB : new Date(),
        phone : "9620822444",
        email : "contact@nandakiranchits.com",

        prizedInstallment : null,

        removal_details : {
            removed : false,
            removed_date : null,
            removed_reason : null,
        },

        lean_details: {
            isLean : false,
            leanReason : null,
        },

        status : "NonPrized",

        ticket_no : ticket_no,

        account_balance : 0,
        total_amount_paid : 0,

        cust_id : null,   
        group_id : group_id,     
        createDate : new Date(),
    };

    var doc_id = group_id + "-" + ticket_no;

    var customerRef = db.collection(collectionRef.groupCustomer).doc(doc_id);
    var groupRef = db.collection(collectionRef.group).doc(group_id);

    return db.runTransaction((transaction)=>{
        return transaction.get(customerRef).then((doc)=>{
            if(doc.exists){
                throw new Error("GRoup Customer Already Exists");
            }
            transaction.set(customerRef,data);
            transaction.update(groupRef,{occupied_members: admin.firestore.FieldValue.increment(1)});
            return "success";
        })
    }).then(()=>{
        console.log("Successfully added customer");
        return "success";
    })
    .catch((err)=>{
        console.error(err);
        throw err;
    })
    


}

module.exports = createCompanyCustomer;