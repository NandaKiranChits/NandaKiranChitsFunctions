const stripe = require('stripe')('sk_live_OAUOUX5FYteIk2zaBBEsW4Ro004ozlQl3x');
//const stripe = require('stripe')('sk_test_8zVJDcJow7sw9wssgygHmLWZ00udhUi3bv');
const db = require("../adminDb");
const cors = require('cors')({origin: true});


const createPaymentIntent = async (req,res) =>{

    cors(req,res,async ()=>{
        res.set('Access-Control-Allow-Origin', '*');
        res.set("Access-Control-Allow-Headers", "Content-Type");
        //console.log("POst data = ",req.body);
        //console.log("Total Amount = ",req.body.total);

        var stripeCustomerID;

        var {name,email,mobile} = req.body;

        try{
            stripeCustomerID = await getStripeCustomerID(email,name,mobile);

            console.log("Stripe customer id in the main function is ",stripeCustomerID);
            
            if(stripeCustomerID === -1){
                throw new Error("Unable to create stripe customer");
            }
        }
        catch(err){
            console.error(err);
            res.status(401).send("Unable to create customer");
            return;
        }
    
        const paymentIntent = await stripe.paymentIntents.create({
            amount : parseFloat(parseFloat(req.body.total).toFixed(2))*100,
            currency : "nzd",
            customer : stripeCustomerID
        }).catch((err)=>{
            console.error(err);
            res.status(401).send("Failed to create stripe payment intent. Try again");
            return;
        });
        // to provide it to the createOrder()
        req.body["payment_intent_id"] = paymentIntent["id"];

        console.log("Payment Intnet id is ",paymentIntent["id"]);

        const order_id = await createOrder(req.body,stripeCustomerID);

        if(order_id===-1){
            res.status(401).send("Failed to create order");
            return;
        }

        console.log("Order id for this order is ",order_id);

        res.send({clientSecret : paymentIntent.client_secret});
    })
   
}

const createOrder = (formValues,stripeCustomerId)=>{
    formValues["create_date"] = new Date();
    formValues["status"] = "payment_pending";
    formValues["stripe_cust_id"] = stripeCustomerId;

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

const getStripeCustomerID = async (email,name,phone) =>{
    const query = db.collection("NZSnapCleaning").where("email","==",email).where("status","==","success");

    try{

        const snap = await query.get();
    
        console.log("Size of the customer order is ",snap.size);

        if(snap.size>0){
            return snap.docs[0]["stripe_cust_id"];
        }


        const customer = await stripe.customers.create({email,name,phone});
        //console.log("Customer  = ",customer);
        console.log("Stripe Customer id for email = ",email," name=  ",name," phone = ",phone," is ",customer.id);
    
        return customer.id;
    }
    catch(err){
        console.error(err);
        return -1;
    }
    

}

module.exports = createPaymentIntent;

/*

curl -X POST -H "Content-Type: application/json" \
 -d '{"username":"abc","password":"abc","total":100}' \
 https://us-central1-chitstorm-d6bd1.cloudfunctions.net/createStripePaymentIntent

*/