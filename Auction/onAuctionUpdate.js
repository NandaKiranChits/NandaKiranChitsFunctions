const db = require("../adminDb");
var collections = require("../Collection");
var admin = require("../admin");

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

const onAuctionUpdate = (change,context) =>{
    var prevAuctionData = change.before.data();
    var auctionData = change.after.data();

    if(prevAuctionData.status === "pending" && auctionData.status==="inCollectionAccount"){
    
        return markCustomerAsPrized(auctionData).then(()=>{
            return addInstallmentToUserAccount(auctionData,auctionData.group_id).then(()=>{
                console.log("Done updating user accounts");
                return createNewAuction(auctionData).then(()=>{
                    console.log("New Auction Added succesfully");
                    return;
                }).catch((err)=>{
                    throw err;
                });
            }).catch((err)=>{
                throw err;
            })
        }).catch((err)=>{
            console.error(err);
            return;
        })
    }

}


const markCustomerAsPrized = (auction_data) =>{
    var customerRef = db.collection(collections.groupCustomer)
    var query = customerRef.where("ticket_no","==",auction_data.bidder_details.ticket_id).where("group_id","==",auction_data.group_id);
    var groupRef = db.collection(collections.group).doc(auction_data.group_id);
    return db.runTransaction((transaction)=>{
        return transaction.get(query).then((snap)=>{
            if(snap.size===0){
                throw new Error("Customer Doesnt Exists");
            }
            var customerData;
            var custDocID;

            snap.forEach((doc)=>{
                customerData = doc.data();
                custDocID = doc.id;
            })
            
            if(customerData.status==="Prized"){
                throw new Error("Customer is Already Prized");
            }
            transaction.update(groupRef,{no_of_auctions_completed:admin.firestore.FieldValue.increment(1)});
            transaction.update(customerRef.doc(custDocID),{status:"Prized",prizedInstallment:auction_data.auction_no});
            return "success"
        })
    }).then(()=>{
        console.log("Customer Marked As Prized Succesfully");
        return;
    }).catch((err)=>{
        console.error(err);
        throw err;
    })
}

const addInstallmentToUserAccount = (auction_data,group_id) =>{
    var groupRef = db.collection(collections.group).doc(group_id);
    var installmentRef = db.collection(collections.installment);
    var groupCustomerRef = db.collection(collections.groupCustomer).where("group_id","==",group_id);

    return groupRef.get().then((groupDoc)=>{
        var groupData = groupDoc.data();
        return db.runTransaction((transaction)=>{
            return transaction.get(groupCustomerRef).then((snap)=>{
                console.log("Adding Installment group Size got = ",snap.size);
                
                snap.forEach((doc)=>{
                    var userData = doc.data();
                    var userRef = db.collection(collections.groupCustomer).doc(doc.id);
                    var userInstallmentID = group_id + "-" + (auction_data.auction_no+1) + "-" + userData.ticket_no;
                    var userInstallmentRef = installmentRef.doc(userInstallmentID);

                    console.log("Adding Installment to ticket ",userData.ticket_no);

                    var instData = {
                        auction_no  : auction_data.auction_no + 1,
                        cust_id : userData.cust_id,
                        
                        contributed_to : [],// {receipt_id:id,amount:amount,installment_id:inst_id}
                        accepted_from_other : 0 ,
                        advance_paid :0 ,
                        donated : 0,
                        comments : null,
                        dividend : auction_data.bidding_details.dividend,
                        due_date : new Date(auction_data.create_date.toDate()).addDays(groupData.interestStartsAfterHowManyDays),
                        generated_date : new Date(),
                        group_id : group_id,
                        receipt_usage : [],
                        installment_value : groupData.monthly_subscription,
                        interestRate :(userData.status==="Prized"?groupData.prizedInterestRate:groupData.nonPrizedInterestRate),
                        other_charges : 0,
                        receipt_ids : [],
                        status : "due",
                        system_comments : null,
                        ticket_no : userData.ticket_no,
                        total_paid : 0,
                        interest : 0,
                        waived_interest : 0,
                    }
                    transaction.set(userInstallmentRef,instData);
                    transaction.update(userRef,{account_balance:admin.firestore.FieldValue.increment(-(instData.installment_value-instData.dividend))});
                })
                return "succcess";
            })
        }).then(()=>{
            console.log("Installments added to user accounts succesfully");
            return;
        }).catch((err)=>{
            console.error(err);
            throw err;
        })
    }).then(()=>{
        console.log("Installments added succesfully");
        return;
    })
    .catch((err)=>{
        console.error(err);
        throw err;
    })
}


function createNewAuction(auctionData){
    var nextauctionData = {
        date_and_time : new Date(auctionData.next_auction_details.next_auction_date.toDate()),
        auction_no : auctionData.auction_no + 1,

        bidder_details : {
            cust_id : null,
            ticket_id : null,
        },

        bidding_details: {
            bid_amount : 0,
            dividend : 0 ,
        },

        bidding_policy : auctionData.bidding_policy,

        chit_value : auctionData.chit_value ,
        company_auction : false,

        create_date : new Date(),

        group_id : auctionData.group_id,
        isOnlineAuction : false,

        next_auction_details : {
            next_auction_date : null,
        },

        payment_details : {
            amount_disbursed : 0,
            gst : 0,
            verification_charges : 0,
        },

        status : 'pending',
        vouchers : []
    };

    var newAuctID = auctionData.group_id + "-" + nextauctionData.auction_no;
    var newAuctRef = db.collection("Auction").doc(newAuctID);
    var groupRef = db.collection(collections.group).doc(auctionData.group_id);

    return db.runTransaction((transaction)=>{
        return transaction.getAll(newAuctRef,groupRef).then((docs)=>{
            let auctDoc = docs[0];
            let groupDoc = docs[1];
            if(!groupDoc.exists){
                throw new Error("Group Doesnt Exist");
            }
            if(auctDoc.exists){
                throw new Error("Auction already exists");
            }
            let groupData = groupDoc.data();
            if(groupData.no_of_auctions_completed===groupData.no_of_months){
                throw new Error("All the ",groupData.no_of_auctions_completed," auctions are completed ");
            }
            transaction.set(newAuctRef,nextauctionData);
            return;
        })
    }).then(()=>{
        console.log("Auction added succesfully");
        return;
    }).catch((err)=>{
        console.error(err);
        return;
    })

}




module.exports = onAuctionUpdate;