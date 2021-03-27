var db = require("./adminDb");
var CollectionNames = require("./Collection");

var query = db.collection(CollectionNames.installment)
                  .where("group_id","==","TEST")
                  .where("ticket_no","==","1")
                  .where("advance_paid",">",0);


query.get().then((snap)=>{
    snap.forEach((doc)=>{
        console.log(doc.data());
    })
    return "success";
}).catch((err)=>{
    console.error(err);
})