const db = require("../adminDb");

const html = `
<html>
  <head>
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
  <title>Thanks for your order!</title></head>
  <body>
    <div  class="jumbotron text-center" style="height:100%">
        <h1 class="display-3">Thank You!</h1>
        <p class="lead">We Appreciate your business. Please Contact us if you face any problem.</p>
        <hr>
        <p class="lead">
            <a class="btn btn-primary btn-sm" href="https://snapcleaning.co.nz/home-cleaning-new/" role="button">Continue to homepage</a>
        </p>
    </div>
  </body>
</html>
`;

const stripepaymentSuccess = (req,res) =>{
    var order_id = req.query.order_id;

    const orderRef = db.collection("NZSnapCleaning").doc(order_id);

    return orderRef.update({status:"success"}).then(()=>{
        console.log("Order Payment Succesfully");
        console.log("ORder updated succesfully");
        res.status(200).send(html);
        return "success";
    }).catch((err)=>{
        console.error(err);
        console.log("Failed to update order");
        console.log("Donot know what to do");
        res.status(200).send(html);
        return "failure";
    })
}

module.exports = stripepaymentSuccess;