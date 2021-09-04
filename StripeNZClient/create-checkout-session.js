const stripe = require('stripe')('sk_test_8zVJDcJow7sw9wssgygHmLWZ00udhUi3bv');
const db = require("../adminDb");

const createCheckout = async (req,res) =>{
    res.set('Access-Control-Allow-Origin', '*');
    console.log("Total Amount = ",req.body.total);
    console.log("POst data = ",req.body);
    console.log("Request url = ",req.query);

    const order_id = await createOrder(req.body);

    if(order_id===-1){
        res.status(401).send("Failed to create order");
        return;
    }
    
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Total',
              },
              unit_amount: parseFloat(req.body.total)*100,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: 'https://us-central1-chitstorm-d6bd1.cloudfunctions.net/stripePaymentSuccess?order_id='+order_id,
        cancel_url: 'https://us-central1-chitstorm-d6bd1.cloudfunctions.net/stripePaymentFailure?order_id='+order_id,
      });
    
      res.redirect(303, session.url);
   
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

module.exports = createCheckout;