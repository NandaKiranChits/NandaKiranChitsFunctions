const fs = require("fs");
var content = fs.readFileSync("./StripeNZClient/mail.html").toString();

content = content.replace("{{total}}","100");
console.log("content = ",content);