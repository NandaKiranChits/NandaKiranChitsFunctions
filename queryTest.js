var db = require("./adminDb");
var collections = require("./Collection");

var query = db.collection(collections.installment)
.where("group_id","==","NK9002")
.where("ticket_no","==","26")
.where("status","in",["due","part","paid"])
.orderBy("auction_no");


query.get().then((snap)=>{
    snap.forEach((doc)=>{
        console.log(doc.data()["auction_no"]);
    })
    return "success";
}).catch((err)=>{
    console.error(err);
})