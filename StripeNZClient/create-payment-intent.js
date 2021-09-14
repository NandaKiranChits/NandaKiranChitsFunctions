const stripe = require('stripe')('sk_live_OAUOUX5FYteIk2zaBBEsW4Ro004ozlQl3x');
const db = require("../adminDb");
const cors = require('cors')({origin: true});

const createPaymentIntent = async (req,res) =>{

    cors(req,res,async ()=>{
        res.set('Access-Control-Allow-Origin', '*');
        res.set("Access-Control-Allow-Headers", "Content-Type");
        console.log("POst data = ",req.body);
        console.log("Total Amount = ",req.body.total);
        console.log("Request url = ",req.query);

    
        const paymentIntent = await stripe.paymentIntents.create({
            amount : parseFloat(req.body.total)*100,
            currency : "nzd",
        }).catch((err)=>{
            console.error(err);
            res.status(401).send("Failed to create stripe payment intent. Try again");
            return;
        });

        req.body["payment_intent_id"] = paymentIntent["id"];

        const order_id = await createOrder(req.body);

        if(order_id===-1){
            res.status(401).send("Failed to create order");
            return;
        }

        console.log("Order id for this order is ",order_id);

        res.send({clientSecret : paymentIntent.client_secret});
    })
   
}

const createOrder = (formValues)=>{
    formValues["create_date"] = new Date();
    formValues["status"] = "payment_pending";

    var order_id = 1;
    var collectionRef = db.collection("NZSnapCleaning");
    var orderIdQuery = collectionRef.orderBy("order_id","desc").limit(1);

    return db.runTransaction((transaction)=>{
        return transaction.get(orderIdQuery).then((snap)=>{ 
            snap.forEach((doc)=>{
                order_id = doc.data()["order_id"] + 1;
            });
            formValues["order_id"] = order_id;
            var newOrderRef = collectionRef.doc(order_id.toString());
            transaction.set(newOrderRef,formValues);
            return "success";
        })
    }).then(()=>{
        console.log("New Order id = ",order_id);
        return order_id;
    }).catch((err)=>{
        console.error(err);
        return -1;
    })
}

module.exports = createPaymentIntent;

/*

curl -X POST -H "Content-Type: application/json" \
 -d '{"username":"abc","password":"abc","total":100}' \
 https://us-central1-chitstorm-d6bd1.cloudfunctions.net/createStripePaymentIntent

*/