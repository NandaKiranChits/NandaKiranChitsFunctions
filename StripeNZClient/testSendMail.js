const db = require("../adminDb");
const sendMail = require("./sendMail");

var order_id = 23;

const ref= db.collection("NZSnapCleaning").doc(order_id.toString());

ref.get().then(async(doc)=>{
    if(!doc.exists){
        console.log("Document not found");
        return;
    }
    var order_data = doc.data();
    await sendMail(order_data["email"],order_data);
    console.log("MAil Sent succesfully");
    return "done";
}).catch((err)=>{
    console.error("Caught an error");
    console.error(err);
    return;
})