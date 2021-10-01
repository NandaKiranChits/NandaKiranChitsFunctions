var db = require("./adminDb");
var collections = require("./Collection");

var query = db.collection(collections.installment)
.where("group_id","==","NK5004")
.where("auction_no","==",1);


query.get().then((snap)=>{
    snap.forEach((doc)=>{
        console.log(doc.data()["auction_no"]);  
        var instRef = db.collection(collections.installment).doc(doc.id);
        instRef.update({other_charges:250,system_comments:"Admission fees"});
    })
    return "success";
}).catch((err)=>{
    console.error(err);
})