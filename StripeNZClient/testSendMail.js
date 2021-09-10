const db = require("../adminDb");
const sendMail = require("./sendMail");

var order_id = 24;

const ref= db.collection("NZSnapCleaning").doc(order_id.toString());

return ref.get().then(async(doc)=>{
    if(!doc.exists){
        console.log("Document not found");
        return;
    }
    var order_data = doc.data();
    await sendMail(order_data["email"],order_data);
    console.log("MAil Sent succesfully");
}).catch((err)=>{
    console.error("Caught an error");
    console.error(err);
    return;
})