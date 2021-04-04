function getPayable(instData){
    let {
        dividend,
        installment_value,
        interest,
        waived_interest,
        total_paid,
        other_charges,
    } = instData;

    return (
          (installment_value - dividend) 
        + (interest - waived_interest)
        + (other_charges)
        - (total_paid)
    );
}
module.exports = getPayable;