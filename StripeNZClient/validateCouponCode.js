const db = require("../adminDb");
const cors = require('cors')({origin: true});

const couponCodes = [
   
    {
        coupon_code : "MOVE50",
        percent_discount : false,
        percentage:null,
        flat_discount : 50,
        min_order_value: 300,
        max_discount_value:null,
        start_date : new Date(2021,10,1,0,0,0), //month is zero indexed Date : Nov 1st 2021 12:00:00 AM 
        end_date   : new Date(2021,11,31,23,59,59), // ends on 31 Dec 2021 11:59:59 PM 
        applicable_frequency : ["End of Tenancy"],
        max_times : 10,
        only_for_new_users : false,
    },
    {
        coupon_code : "FLAT10",
        percent_discount : true,
        percentage : 10,
        flat_discount : null,
        min_order_value : 0,
        max_discount_value : 10000000000,
        start_date : new Date(2021,10,1,0,0,0), //month is zero indexed Date : Nov 1st 2021 12:00:00 AM 
        end_date   : new Date(2021,11,31,23,59,59), // ends on 31 Dec 2021 11:59:59 PM
        applicable_frequency : ["End of Tenancy","Weekly","Fortnightly","Move in Cleaning"],
        max_times : 10, 
        only_for_new_users : false,
    },
    {
        coupon_code : "FLAT50",
        percentage_discount : true,
        percentage : 50,
        flat_discount : null,
        min_order_value : 0,
        max_discount_value : 10000000000000000,
        start_date : new Date(2022,0,1,0,0,0), //month is zero indexed Date : Jan 1st 2022 12:00:00 AM 
        end_date   : new Date(2022,1,28,23,59,59), // ends on 28 Feb 2022 11:59:59 PM
        applicable_frequency : ["Weekly","Fornightly"],
        max_times : 1,
        only_for_new_users : true,
    },
    {
        coupon_code : "MOVE100",
        percentage_discount : false,
        percentage : null,
        flat_discount : 100,
        min_order_value : 450,
        max_discount_value : null,
        start_date : new Date(2022,2,1,0,0,0), //month is zero indexed Date : Mar 1st 2022 12:00:00 AM 
        end_date   : new Date(2022,3,30,23,59,59), // ends on 30 Apr 2022 11:59:59 PM
        applicable_frequency : ["End of Tenancy","Move in Cleaning"],
        max_times : 10,
        only_for_new_users : false,
    },
    {
        coupon_code : "FLAT20",
        percentage_discount : true,
        percentage : 20,
        
        flat_discount : null,
        min_order_value : 0,
        max_discount_value : 100000,
        start_date : new Date(2022,0,1,0,0,0), //month is zero indexed Date : Jan 1st 2022 12:00:00 AM 
        end_date   : new Date(2022,11,31,23,59,59), // ends on 31 Dec 2022 11:59:59 PM
        applicable_frequency : ["Weekly","Fortnightly"],
        max_times : 1,
        only_for_new_users : true,
    },
    {
        coupon_code : "FATHER20",
        percentage_discount : true,
        percentage : 20,
        flat_discount : null,
        min_order_value : 0,
        max_discount_value : 100000,
        start_date : new Date(2022,7,27,0,0,0), //month is zero indexed Date : Aug 27th 2022 12:00:00 AM 
        end_date   : new Date(2022,8,3,23,59,59), // ends on 3rd Sep 2022 11:59:59 PM
        applicable_frequency : ["End of Tenancy","Move in Cleaning","Weekly","Fortnightly"],
        max_times : 1,
        only_for_new_users : false,
    },
    {
        coupon_code : "MOTHER20",
        percentage_discount : true,
        percentage : 20,
        flat_discount : null,
        min_order_value : 0,
        max_discount_value : 100000,
        start_date : new Date(2022,4,2,0,0,0), //month is zero indexed Date : May 2nd 2022 12:00:00 AM 
        end_date   : new Date(2022,4,8,23,59,59), // ends on 8th May 2022 11:59:59 PM
        applicable_frequency : ["End of Tenancy","Move in Cleaning","Weekly","Fortnightly"],
        max_times : 1,
        only_for_new_users : false,
    },
    {
        coupon_code : "REFER40",
        percentage_discount : false,
        percentage : null,
        flat_discount : 40,
        min_order_value : 70,
        max_discount_value : null,
        start_date : new Date(2021,9,1,0,0,0), //month is zero indexed Date : Oct 1st 2021 12:00:00 AM 
        end_date   : new Date(2023,11,31,23,59,59), // ends on 23rd Dec 2023 11:59:59 PM
        applicable_frequency : ["End of Tenancy","Move in Cleaning","Weekly","Fortnightly"],
        max_times : 1,
        only_for_new_users : false,
    },
    
];

const orderCollectionRef = db.collection("NZSnapCleaning");


const validateCoupon = async (req,res) =>{

    cors(req,res,async ()=>{
        res.set('Access-Control-Allow-Origin', '*');
        res.set("Access-Control-Allow-Headers", "Content-Type");
        console.log("POst data = ",req.body);

        const couponCode = req.body["couponCode"];
        const frequency = req.body["frequency"];
        const totalOrderValue = parseFloat(req.body["superTotal"]);
        const email = req.body["email"];

        if(!email){
            res.send({status:"failure",message:"Please Enter Email id"});
            return;
        }
        if(!couponCode){
            res.send({status:"failure",message:"Please Enter coupon code"});
            return;
        }
        if(!totalOrderValue){
            res.send({status:"failure",message:"Please Add Items"});
            return;
        }
        if(!frequency){
            res.send({status:"failure",message:"Please Enter Frequency"});
            return;
        }

        if(totalOrderValue===0){
            res.send({status:"failure",message:"Please Add Items"});
            return;
        }

        console.log("Coupon Code = ",couponCode," Frequency = ",frequency," Order value = ",totalOrderValue);

        const couponCodeData = getCouponData(couponCode);
        console.log("Coupon Code Data = ",couponCodeData);


        if(couponCodeData===-1){
            console.log("Coupon Code data not found");
            res.send({"status":"failure","message":"Coupon Code not found"});
            return;
        }

        if(couponCodeData["min_order_value"] > totalOrderValue ){
            console.log("Order Value is less than min order value");
            res.send({"status":"failure","message":"Minimum order value for this coupon is $ "+couponCodeData["min_order_value"]});
            return;
        }

        if(!couponCodeData["applicable_frequency"].includes(frequency)){
            console.log("This coupon code is not applicable for the frequency "+frequency);
            res.send({"status":"failure","message":"This coupon code is not applicable for the frequency "+frequency});
            return;
        }

        const today = new Date();
            
        if((couponCodeData["start_date"] > today)){ // if the start date is greater than today
            console.log("The start date is greater than today start date ",couponCodeData["start_date"]," today = ",today);
            res.send({status:"failure",message:"The coupon code is not valid"});
            return;
        }

        if((couponCodeData["end_date"] < today )){ // if the end date is lesser than today
            console.log("the end date is lesser than today end date = ",couponCodeData["end_date"]," today = ",today);
            res.send({status:"failure",message:"The coupon code has expired"});
            return;
        }
        
        if(couponCodeData["only_for_new_users"]){
            var isNewUser = await checkIfNewUser(email);

            if(!isNewUser){
                console.log("The coupon is only applicable for first time users");
                res.send({status:"failure",message:"Coupon is applicable only for first time users"});
                return;
            }
        }

        var no_of_times_used = await getNoOfTimesUsed(email,couponCodeData["coupon_code"]);

        if(couponCodeData["max_times"] < no_of_times_used){ // if no. of times is more than max times
            console.log("Max times  = ",couponCodeData["max_times"]," Used = ",no_of_times_used);
            res.send({status:"failure",message:"Coupon is only applicable for max "+couponCodeData["max_times"]});
            return;
        }

        var discount = 0;

        if(!couponCodeData["percentage_discount"]){
            discount = (couponCodeData["flat_discount"] > totalOrderValue) ? totalOrderValue : couponCodeData["flat_discount"];
            res.send({status:"success",value:discount});
            return;
        }
        else{
            var temp = (totalOrderValue * (couponCodeData["percentage"]/100));
            discount = (temp > couponCodeData["max_discount_value"]) ? couponCodeData["max_discount_value"] : temp;
            res.send({status:"success",value:discount});
            return;
        }
    })
}

const checkIfNewUser = (email) =>{
    const query = orderCollectionRef.where("email","==",email);

    return query.get().then((snap)=>{
        if(snap.size>0){
            return false;
        }
        return true;
    }).catch((err)=>{
        console.error(err);
        return true;
    })
}

const getNoOfTimesUsed = (email,coupon_code) =>{
    const query = orderCollectionRef
                  .where("email","==",email)
                  .where("coupon_code","==",coupon_code);
    
    return query.get().then((snap)=>{
        return snap.size();
    }).catch((err)=>{
        console.error(err);
        return 0;
    })
}

const getCouponData = (couponCode) =>{

    for(var i=0;i<couponCodes.length;i++){
        if(couponCodes[i]["coupon_code"] === couponCode){
            return couponCodes[i];
        }
    }

    return -1;
}

module.exports = validateCoupon;