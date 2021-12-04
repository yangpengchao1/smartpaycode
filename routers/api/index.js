const Router = require("koa-router");
const path = require('path');
const csv = require('csvtojson');
const lodash = require("lodash");

let router = new Router();

router.post('/getResult', async ctx => {
    const {industry, transactionVolume, transactionCount, csv_file} = ctx.request.fields;
    const file_name = path.basename(csv_file[0].path)
    const csvFilePath = path.resolve(__dirname, `../../static/upload/${file_name}`);
    const finalPrice = await getFinalPrice(industry, transactionVolume, transactionCount, csvFilePath);
    ctx.body = {"finalPrice": finalPrice};
});

getFinalPrice = async (industry, transactionVolume, transactionCount, csvFilePath) => {
    const jsonArray = await csv().fromFile(csvFilePath);

    if (await checkIndustry(jsonArray, industry)) {
        const terminalPrice = await getTerminalPrice(jsonArray, industry);
        const transactionVolumePrice = await getTransactionVolumePrice(jsonArray, industry, transactionVolume);
        const transactionCountPrice = await getTransactionCountPrice(jsonArray, industry, transactionCount);
        return Math.round((terminalPrice + transactionVolumePrice + transactionCountPrice) * 100) / 100;
    }
}

checkIndustry = async (arr, industry) => {
    const target = arr.find(item => {
        return item.Industry === industry;
    })
    if (!target) {
        throw new Error("Industry invalid");
    }
    return true;
}

getTerminalPrice = async (arr, industry) => {
    const target = arr.find(item => {
        return item.Industry === industry && item.Type === 'TERMINAL';
    })
    if (!target) {
        return 0;
    }
    return parseFloat(target.Price);
}

getTransactionVolumePrice = async (arr, industry, transactionVolume) => {
    const target = arr.find(item => {
        return item.Industry === industry && item.Type === 'TRANSACTION_VOLUME' && item.Value === transactionVolume.toString();
    })
    if (!target) {
        throw new Error('TransactionVolume invalid');
    }
    return parseFloat(target.Price);
}

getTransactionCountPrice = async (arr, industry, transactionCount) => {
    if(!/^[0-9]+.?[0-9]*$/.test(transactionCount.toString())){
        throw new Error("TransactionCount invalid");
    }

    transactionCount = parseFloat(transactionCount.toString());
    //Get 'TRANSACTION_COUNT' Array
    const newArray = arr.filter(item => {
        return item.Industry === industry && item.Type === 'TRANSACTION_COUNT';
    })

    //Format string value to int or float
    let formatArray = [];
    newArray.map(item => {
        formatArray.push({
            Industry: item.Industry,
            Type: item.Type,
            Value: parseInt(item.Value),
            Price: parseFloat(item.Price)
        });
    })

    //Sort Array by 'Value'
    const sortedArray = lodash.orderBy(formatArray, ['Value'], ['asc'])

    //Find 2 points
    const targetIndex = sortedArray.findIndex((item, index) => {
        return item.Value < transactionCount && sortedArray[index + 1].Value > transactionCount;
    })

    //calculate
    const target1 = sortedArray[targetIndex];
    const target2 = sortedArray[targetIndex + 1];
    if (targetIndex < 0) {
        throw new Error("TransactionCount invalid");
    }
    return (transactionCount - target1.Value) / (target2.Value - target1.Value) * (target2.Price - target1.Price) + target1.Price;
}

module.exports = router.routes();