const url = "https://snapcleaning.co.nz/?wpwhpro_action=mail&wpwhpro_api_key=gkfchn6uayr6whunghtb502em0vdqud9ggb0zbqz1iqu9vyputvwonyqsvfabqzz";
const axios = require("axios").default;

function sendMail(email,name){
    var data = {
        "action" : "send_email",
        "send_to" : email,
        "subject" : "We have received your order",
        "message" : `
            Hello ${name},<br />
            <br />    
            We have succesfully received your order for our home cleaning service. We appreciate your business. Thanks for choosing us.
            <br />
            <br />
            Regards,
            Snap Cleaning,
        `,
        "headers" : [
            "Content-Type: text/html; charset=UTF-8",
            "From: Snap Cleaning ",
        ],

    }

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