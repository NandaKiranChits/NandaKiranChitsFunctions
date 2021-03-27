var db = require("../adminDb");
var collectionRef = require("../Collection");
var addGroupCustomer = require("./CreateCompanyCustomer");
var addFirstAuctionAsCompanyAuction = require("./AddFirstAuctionAsCompanyAuction");
var addAuction = require("./createFirstAuction");



/*

1. First Installment is added to customer account on creating customer

*/

const onGroupAdd = (snap,context) =>{
    var groupData = snap.data();

    return addAuction(groupData.first_auction_date.toDate(),groupData.foreman_commission,groupData.min_bid,groupData.max_bid,groupData.group_value,groupData.group_name).then((status)=>{
        console.log("Add Auction Status = ",status);
        if(groupData.company_chit_exists){
            
            return addGroupCustomer(groupData.group_name,groupData.company_chit_no).then((status)=>{
                console.log("Company Group Customer Added Succesfully ",status);
                if(groupData.first_auction_is_company_auction){
                    
                    return addFirstAuctionAsCompanyAuction(1,groupData.company_chit_no,groupData.group_name,groupData.first_auction_date.toDate()).then(()=>{
                        console.log("First Auction added as company auction");
                        return;
                    }).catch((err)=>{
                        console.error(err);
                        throw err;
                    })
                
                }
                else{
                    console.log("First auction is not company auction")
                }

                return "success";
            
            }).catch((err)=>{
                console.error(err);
                throw err;
            })
        }
        else{
            console.log("company chit doesnt exist");
        }
        return "success"
    }).then(()=>{
        console.log("Group Create Procedured completed");
        return;
    })
    .catch((err)=>{
        console.error(err);
    })
    


}

module.exports = onGroupAdd;