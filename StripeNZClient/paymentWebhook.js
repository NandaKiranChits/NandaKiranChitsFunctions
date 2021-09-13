const stripe = require('stripe')('pk_live_2vwVdjZ2qs0MRgeVFoGkWBF300FzATeVZJ');
const db = require("../adminDb");
const sendMail = require("./sendMail");

// This is your Stripe CLI webhook secret for testing your endpoint locally.
//const endpointSecret = "whsec_gzCNEkjxvV5iho7zY6TfUK16mnF2tS3h";
//const bodyParser = require('body-parser');

const paymentWebhook =async (req,res) =>{
    const sig = req.headers['stripe-signature'];

    //console.log("Signature = ",sig);

    //console.log(req.body);
    let event = req.body;

    console.log("Event Type = ",event.type);
    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            await markPaymentAsSuccess(event.data.object["id"]); // give payment intent id
            console.log('PaymentIntent was successful!');
            break;
        case 'payment_method.attached':
            //const paymentMethod = event.data.object;
            console.log('PaymentMethod was attached to a Customer!');
            break;
            // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({received: true});
}

function markPaymentAsSuccess(payment_intent_id){
    const collectionRef = db.collection("NZSnapCleaning");
    const query = collectionRef.where("payment_intent_id","==",payment_intent_id);

    return db.runTransaction((transaction)=>{
        return transaction.get(query).then((snap)=>{
            if(snap.size===0){
                console.log("Order not found");
                return;
            }
            var order_data ;
            snap.forEach((doc)=>{
                order_data = doc.data();
                transaction.update(collectionRef.doc(doc.id),{status:"success"});
            })

            return order_data;
        })
    }).then(async (order_data)=>{
        await sendMail(order_data["email"],order_data);
        await sendMail("support@snapcleaning.co.nz",order_data);
        console.log("Succesfully updated the order");
        return;
    }).catch((err)=>{
        console.error(err);
        return;
    })
}

module.exports = paymentWebhook; 