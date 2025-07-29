
const { parse, format, endOfMonth, isBefore } = require('date-fns');

const stringDateToJavaDate = (dateString) => {
    return parse(dateString, 'dd/MM/yyyy', new Date(0))
}

const JavaDateToStringDate = (date) => {
    return format(date, 'dd/MM/yyyy')
}

const isValidDateFormat = (dateString) => {
    const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    return regex.test(dateString)
}

const isDeliveringDateBeforeToday = (date) => {
    if (!date) {
        return true
    }

    try {

        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        date.setHours(0, 0, 0, 0);
        console.log(date);
        console.log(todayDate);
        return isBefore(date, todayDate)
    }
    catch (error) {
        console.log("Error in isDeliveringDateBeforeToday:", error);
        return true
    }
}

module.exports = {
    stringDateToJavaDate,
    JavaDateToStringDate,
    isValidDateFormat,
    isDeliveringDateBeforeToday
}