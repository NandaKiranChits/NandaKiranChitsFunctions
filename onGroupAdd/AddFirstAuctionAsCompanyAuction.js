var db = require("../adminDb");
var collectionRef = require("../Collection");
var admin = require("../admin");

const addFirstAuctionAsCompanyAuction = (auction_id,company_chit_no,group_id,auction_date) =>{

    var auctionID = group_id + "-" + auction_id;
    var auctionRef = db.collection(collectionRef.auction).doc(auctionID);
    var groupRef = db.collection(collectionRef.group).doc(group_id);

    return db.runTransaction((transaction)=>{
        return transaction.get(auctionRef).then((doc)=>{
            if(!doc.exists){
                throw new Error("Auction Doesnt Exists");
            }
            var auctionData = doc.data();
            transaction.update(auctionRef,{
                "bidder_details.cust_id" : null,
                "bidder_details.ticket_id" : company_chit_no,
                "bidding_details.bid_amount" : (auctionData.chit_value * (auctionData.bidding_policy.min_bid/100)),
                "bidding_details.dividend" : 0,
                "company_auction" : true,
                "isOnlineAuction": false,
                "status" : "inCollectionAccount",
                "next_auction_details.next_auction_date" :  new Date(auction_date),
            });
            transaction.update(groupRef,{no_of_auctions_completed:admin.firestore.FieldValue.increment(1)});
            return "success";
        })
    }).then(()=>{
        console.log("Auction Updated Succesfully");
        return "success";
    })
    .catch((err)=>{
        console.error(err);
        throw err;
    })
}

module.exports = addFirstAuctionAsCompanyAuction;