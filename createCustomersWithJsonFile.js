var db = require("./adminDb");
var collection = require("./Collection");
const fs = require('fs');

var customerRef = db.collection(collection.customer);

let rawdata = fs.readFileSync('/home/vinay/Projects/NandakiranChits/downloadNandaKiranchitsData/customerDownload.json');
let json_data = JSON.parse(rawdata);

let customer_list = json_data.data;

console.log(customer_list);

var not_added = 0;

customer_list.forEach((customer)=>{
    if(customer.phone===null){
        not_added += 1;
        return;
    }
    var idQuery = db.collection(collection.customer)
                    .doc(customer.phone)
    var newData = getCustomerData(customer);

    return idQuery.set(newData);
    
})
console.log("Not added  = ",not_added);


function getCustomerData(available_data){
    var dob = new Date(1970,0,1);
    dob.setSeconds(available_data.dob.seconds)
    var customerData = {
        id :  available_data.phone,

        name : available_data.name,
        father_husband_name : available_data.father_husband_name,
        dob : dob,

        phone : available_data.phone,
        phone2 : "",
        email  : available_data.email,
        address : available_data.address,

        nominee_name : available_data.nominee_name,
        nominee_relationship : available_data.nominee_relationship,
        nominee_phone : "",

        bank_name : "",
        ifsc : available_data.ifsc_code,
        account_no : available_data.bank_accnt_no,


        aadhar_no : available_data.aadhar,
        pan_no : available_data.pan,
        gst : available_data.gst,
        income_pa : available_data.income_pa,

        no_of_tickets : 0,

        createDate : new Date(),
    };
    return customerData;
}