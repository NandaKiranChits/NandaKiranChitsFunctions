const collection = require("../Collection");
const db  = require("../adminDb");

const printPaymentReceipt = (req,res) =>{

    const paymentID = req.query.payment_id;


    if(!paymentID){
        console.log("Payment id is not valid");
        res.send({status:"failure",message:"Payment id is not valid"});
        return;
    }

    console.log("Payment id = ",paymentID);

    const paymentRef = db.collection(collection.payments).where("payment_id","==",parseInt(paymentID));
    
    return paymentRef.get().then((snap)=>{
        if(snap.size===0){
            console.log("Payment data doesnt exist");
            res.send({status:"failure",message:"Payment data doesnt exist"});
            return;
        }
        const paymentData = snap.docs[0].data();
        console.log(paymentData);
        const paymentID = paymentData.payment_id;           
        const {group_id,ticket_no} = paymentData;
        const inst_no = paymentData.inst_details.inst_no;


        const instRef = db.collection(collection.installment).doc(group_id+"-"+inst_no.toString()+"-"+ticket_no);

        var currentInstallmentValue = 0;
        var excessPaid = 0;
        var current = 0;
        var arrear = 0 ;
        var other_charges = 0;
        var interest = 0;
        var paymentValue = 0;
        var usedFromOtherInstallment = 0;
        var dividend = 0;
        var instMonth = "";
        var paymentMethod = paymentData["payment_details"]["payment_method"];
        var cheque_no = paymentData["cheque_details"]["cheque_no"];
        var cheque_date = paymentData["cheque_details"]["cheque_date"]===null?"":paymentData["cheque_details"]["cheque_date"].toDate().toLocaleString(undefined,{timeZone:'Asia/Kolkata'});
        var neft_no = paymentData["neft_details"]["neft_no"];
        var comment = paymentData["comments"];
        var custName = paymentData["cust_details"]["name"];
        var phone = paymentData["cust_details"]["phone"];
        var waived_interest = 0;
        var advance_paid = 0;
        

        return instRef.get().then((instDoc)=>{
            if(!instDoc.exists){
                excessPaid = paymentData.payment_details.total_paid;
                res.send({status:"failure",message:"Installment doesnt exist"});
                return;
            }
            const instData = instDoc.data();
            instMonth = instData["generated_date"].toDate().toLocaleString('en-us', { month: 'short' }) + " "+instData["generated_date"].toDate().getFullYear();
            currentInstallmentValue = instData["installment_value"];
            other_charges = instData.other_charges;
            interest = instData.interest;
            usedFromOtherInstallment = instData.accepted_from_other;
            dividend = instData.dividend;
            waived_interest = instData["waived_interest"];
            current = instData["installment_value"];


            instData.receipt_usage.forEach((receipt)=>{
                if(receipt["payment_id"]===paymentID){
                    paymentValue = receipt["value"];

                    receipt["used_in"].forEach((inst_usage)=>{
                        if(inst_usage["inst_no"]!==inst_no){
                            arrear = inst_usage["used"];
                        }
                    })
                }   
            })


            excessPaid = paymentValue - (current + arrear + other_charges + interest);


            const urlParams =  `?receiptDate=${paymentData["date"].toDate().toLocaleString(undefined,{timeZone:'Asia/Kolkata'})}`+
                            `&groupID=${group_id}`+
                            `&ticket_no=${ticket_no}`+
                            `&inst_no=${inst_no}`+
                            `&inst_month=${instMonth}`+
                            `&current=${current}`+
                            `&other_charges=${other_charges}`+
                            `&late_payment_fee=${interest-waived_interest}`+
                            `&arrears=${arrear}`+
                            `&dividend=${dividend}`+
                            `&totalAmount=${paymentValue}`+
                            `&payment_method=${paymentMethod}`+
                            `&cheque_no=${cheque_no}`+
                            `&cheque_date=${cheque_date}`+
                            `&neft_no=${neft_no}`+
                            `&comment=${comment}`+
                            `&custName=${custName}`+
                            `&custPhone=${phone}`;


            res.redirect("http://nandakiranchits.com/PaymentPage/index.html"+urlParams);
            return;

        }).catch((err)=>{throw err;})
                        
    }).catch((err)=>{
        console.error(err);
        res.send({status:"failure",message:err.message});
        return;
    })

}

module.exports = printPaymentReceipt;
