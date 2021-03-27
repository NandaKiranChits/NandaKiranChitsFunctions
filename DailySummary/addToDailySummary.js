var admin = require("../admin");
var db = require("../adminDb");
var collectionNames = require("../Collection");

const addToDailySummary = (amount,payment_method) =>{

    var documentID = getDocumentID();

    var ref = db.collection(collectionNames.daily_collection).doc(documentID);

    return db.runTransaction((transaction)=>{
        return transaction.get(ref).then((doc)=>{
            let dailySummaryData;
            if(!doc.exists){
                dailySummaryData = getNewDailySummary();
                dailySummaryData[payment_method.toLowerCase()] = amount;
                transaction.set(ref,dailySummaryData);
                return null;
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
    })

}


function getDocumentID(){
    let date = new Date();
    let temp = date.toLocaleString('de-DE', {timeZone: 'Asia/Kolkata' });
    console.log("Date before processing ",temp);
    let res = temp.split(",");
    console.log("On split = ",res);
    let date_string = res[0].toString();
    console.log("Date String after processing ",date_string);
    return date_string;
}


function getNewDailySummary(){
    return {
        date : new Date(),
        cash : 0,
        cheque : 0,
        neft : 0,
    };
}

module.exports = addToDailySummary;