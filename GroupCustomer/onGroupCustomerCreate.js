const db = require("../adminDb");
const admin = require("../admin");
var collections = require("../Collection");

const onCustomerCreate = (snap,context) =>{
    
    var customerData = snap.data();

    var customerRef = db.collection(collections.groupCustomer).doc(snap.id);
    var superCustRef = null;

    if(customerData.cust_id!==null){
        superCustRef = db.collection(collections.Customer).doc(customerData.cust_id);
    }
    var groupRef = db.collection(collections.group).doc(customerData.group_id);
    var getAllAuctions = db.collection(collections.auction)
                           .where("group_id","==",customerData.group_id)
                           .where("status","not-in",["failed","re-scheduled","re-auctioned","pending"]);

    return groupRef.get().then((doc)=>{
        if(!doc.exists){
            console.log("Group Doesnt exists");
            throw new Error("Group Doesnt exist");
        }
        var groupData = doc.data();
        return db.runTransaction((transaction)=>{
            return transaction.get(getAllAuctions).then((snap)=>{
                // you always pay for next auction
                snap.forEach((doc)=>{
                    var auctionData = doc.data();
                    var installmentID = customerData.group_id + "-" + (auctionData.auction_no+1) + "-" + customerData.ticket_no;
                    var installmentRef = db.collection(collections.installment).doc(installmentID);
                    var instData = getInstallmentData(customerData,auctionData.auction_no+1, auctionData.date_and_time.toDate(),auctionData.bidding_details.dividend,groupData);
                    transaction.set(installmentRef,instData);
                    transaction.update(customerRef,{account_balance:admin.firestore.FieldValue.increment(-(instData.installment_value-instData.dividend))});
                });

                //add first auction installment
                var installmentID = customerData.group_id + "-" + (1) + "-" + customerData.ticket_no;
                var installmentRef = db.collection(collections.installment).doc(installmentID);
                var installmentData = getInstallmentData(customerData,1, (groupData.first_auction_date.toDate()),0,groupData);
                transaction.update(customerRef,{account_balance:admin.firestore.FieldValue.increment(-(installmentData.installment_value-installmentData.dividend))});
                transaction.set(installmentRef,installmentData);
                if(customerData.cust_id!==null){
                    transaction.update(superCustRef,{no_of_tickets:admin.firestore.FieldValue.increment(1)})
                }
            
                return "success";
            })
        }).then(()=>{
            console.log("Installments Added Succesfully");
            return;
        }).catch((err)=>{
            console.error(err);
            throw err;
        })  
    }).then(()=>{
        return;
    }).catch((err)=>{
        console.error(err);
        throw err;
    })

    
}

function getInstallmentData(customerData,auction_no,auction_date,dividend,groupData){
    var instData = {
        auction_no  : auction_no,
        cust_id : customerData.cust_id,

        contributed_to : [], // {receipt_id:id,amount:amount,installment_id:inst_id}

        accepted_from_other : 0 , 
        advance_paid :0 ,
        donated  : 0,
        comments : null,
        dividend : dividend,
        due_date : new Date(auction_date).addDays(groupData.interestStartsAfterHowManyDays),
        generated_date : new Date(),
        group_id : groupData.group_name,
        installment_value : groupData.monthly_subscription,
        interestRate :(customerData.status==="Prized"?groupData.prizedInterestRate:groupData.nonPrizedInterestRate),
        other_charges : 0,
        receipt_ids : [],
        status : "due",
        system_comments : null,
        ticket_no : customerData.ticket_no,
        total_paid : 0,
        interest : 0,
        waived_interest : 0,
    }

    return instData;
}   

module.exports = onCustomerCreate;