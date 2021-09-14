const url = "https://snapcleaning.co.nz/?wpwhpro_action=mail&wpwhpro_api_key=gkfchn6uayr6whunghtb502em0vdqud9ggb0zbqz1iqu9vyputvwonyqsvfabqzz";
const axios = require("axios").default;
// load fs
const fs = require("fs");

function sendMail(email,order_data){
    var data = {
        "action" : "send_email",
        "send_to" : email,
        "subject" : "We have received your order",
        "message" : "",
        "headers" : [
            "Content-Type: text/html; charset=UTF-8",
            "From: Snap Cleaning ",
        ],

    }

    var content = fs.readFileSync("./StripeNZClient/mail.html").toString();

    content = content.replace("{{order_id}}",order_data["order_id"]);
    content = content.replace("{{total}}",order_data["total"]);
    content = content.replace("{{delivery_address}}",order_data["address"]);
    content = content.replace("{{prefered_date}}",order_data["date"]+" "+order_data["time"]);
    content = content.replace("{{subtotal}}",order_data["subTotal"]);
    content = content.replace("{{gst}}",order_data["gst"]);
    content = content.replace("{{discount}}",order_data["discount"]);
    content = content.replace("{{no_of_bedroom}}",order_data["bedroom"]);
    content = content.replace("{{no_of_bathroom}}",order_data["bathroom"] + " "+order_data["frequency"] );
    

    const elementString = `
    <tr>
        <td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;"> {{field_name}} </td>
        <td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 5px 10px;"> $ {{price}} </td>
    </tr>
    `
    var items = "";
    var totalExtraVal = 0;
    order_data["selectedExtraProducts"].forEach((doc)=>{
        var temp = elementString;
        temp = temp.replace("{{field_name}}",(doc["extra_code"]+" "+doc["name"]));
        temp = temp.replace("{{price}}",doc["value"]);
        items += temp;
        totalExtraVal += doc["value"];
    });

    const bedroom_bathroom_cost = order_data["total"] - order_data["gst"] + order_data["discount"] - totalExtraVal;
    
    content = content.replace("{{items}}",items);
    content = content.replace("{{bedroom_bathroom}}",bedroom_bathroom_cost);
     
    data["message"] = content;

    return axios.post(url,data).then((function(response){
        console.log(response);
        console.log("Mail sent succesfully");
        return;
    })).catch(function(err){
        console.error(err);
        console.log("Failed to send mail");
        return;
    })

}       

module.exports = sendMail;