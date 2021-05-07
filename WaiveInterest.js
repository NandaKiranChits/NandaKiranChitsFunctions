var admin = require("./admin");
var db = require("./adminDb");
var collections = require("./Collection");

const WaiveInterest = () =>{
    var query = db.collection(collections.installment).where("interest",">",0);

    var count = 0;
    return query.get().then((snap)=>{
        snap.forEach((doc)=>{
            db.collection(collections.installment).doc(doc.id).update({interest:0,waived_interest:0});
            count = count + 1;
            console.log("Updated ",doc.id);
        })
        console.log(count);
        return "done dude"
    }).catch((err)=>{
        console.error(err);
    })
}

WaiveInterest();