var admin = require("../admin");
var db = require("../adminDb");
var collectionNames = require("../Collection");


const removeFromDailySummary = (amount,date,payment_method) =>{

    var documentID = getDocumentID(date);

    var ref = db.collection(collectionNames.daily_collection).doc(documentID);

    return db.runTransaction((transaction)=>{
        return transaction.get(ref).then((doc)=>{
            if(!doc.exists){
                throw new Error("Data Doesnt Exist");
            }
            var keyName = payment_method.toLowerCase();
            let toUpdate = {}
            toUpdate[keyName] = admin.firestore.FieldValue.increment(amount);
            transaction.update(ref,toUpdate);
            return null;
        })
    }).then(()=>{
        console.log("Done upating daily summary");
        return;
    })
    .catch((err)=>{
        console.error(err);
        return;
    })

}


function getDocumentID(date){
    let temp = date.toLocaleString('de-DE', {timeZone: 'Asia/Kolkata' });
    console.log("Date before processing ",temp);
    let res = temp.split(",");
    console.log("On split = ",res);
    let date_string = res[0].toString();
    console.log("Date String after processing ",date_string);
    return date_string;
}

module.exports = removeFromDailySummary;