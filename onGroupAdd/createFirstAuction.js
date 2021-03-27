var db = require("../adminDb");
var collectionRef = require("../Collection");

function createAuction(date_and_time,foreman_comission,min_bid,max_bid,chit_value,group_id){
    var auctionData = {
        date_and_time : new Date(date_and_time),
        auction_no : 1,

        bidder_details : {
            cust_id : null,
            ticket_id : null,
        },

        bidding_details: {
            bid_amount : 0,
            dividend : 0 ,
        },

        bidding_policy : {
            foreman_comission,
            min_bid,
            max_bid,
        },

        chit_value ,
        company_auction : false,

        create_date : new Date(),

        group_id,
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

    var doc_id = group_id + "-" + auctionData.auction_no;
    var dbRef = db.collection(collectionRef.auction).doc(doc_id);

    return db.runTransaction((transaction)=>{
        return transaction.get(dbRef).then((doc)=>{
            if(doc.exists){
                throw new Error("Auction already Exists");
            }
            transaction.set(dbRef,auctionData);
            return "success";
        })
    }).then(()=>{
        console.log("Auction Added Succesfully");
        return "success";
    }).catch((err)=>{
        console.error(err);
        throw err;
    })
}

module.exports = createAuction;