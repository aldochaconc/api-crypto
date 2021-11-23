const express = require('express')
const app = express()
const cors = require('cors')
const axios = require('axios')
const Parse = require('parse/node')
const cron = require('node-cron')

const PORT = 8080
const applicationKey = 'yx5XytAAQoQpB3Q0xJtcLZXPRpg984uDUIp5MBVE'
const optionalJSKey = '2yIsbEJ7123WitODyMOT9Za8oHfgXjOxf8txwFLF'

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cors())

Parse.initialize(applicationKey, optionalJSKey)
Parse.serverURL = 'https://parseapi.back4app.com/'
Parse.masterKey = 'XppXTdeCoB3zJ2gT4VcH9NLTtu6Beukz4lrJ1smW';

const Currency = Parse.Object.extend('Currency')
const currencySchema = new Parse.Schema('Currency')
const currencyQuery = new Parse.Query(Currency)

// parse currency as back4app
const setNewCurrency = async (data) => {
    const currency = new Parse.Object("Currency");
    currency.set("name", data.name);
    currency.set("symbol", data.symbol);
    currency.set("price_as_usd", data.price_as_usd)
    currency.set("percent_changed_last_1_hour", data.percent_changed_last_1_hour)
    try {
        let result = await currency.save()
        console.log('New object created with objectId: ' + result.id);
    } catch (error) {
        console.log('Failed to create new object, with error code: ' + error.message);
    }
}

// update back4app
function updateCurrencies() {
    currencySchema.purge({ useMasterKey: true })
        .then(response => console.log(response))
        .catch(err => console.log(err))

    let payload = await axios.get('https://data.messari.io/api/v2/assets')
    let currencies = payload.data.data
        .sort(function (a, b) { return a.percent_changed_last_1_hour - b.percent_changed_last_1_hour })
        .reverse()
        .slice(0, 10)
    
        for (const [key, currency] of Object.entries(currencies)) {
        setNewCurrency({
            id: currency.id,
            name: currency.name,
            symbol: currency.symbol,
            price_as_usd: currency.metrics.market_data.price_usd,
            percent_changed_last_1_hour: currency.metrics.market_data.percent_change_usd_last_1_hour
        })
    }
}

app.get('/', cors(), async (req, res) => {
    currencyQuery.find()
        .then(response => res.json(response))
        .catch(err => res.json(err))
})

// scheduler 10 minutes interval
cron.schedule('*/10 * * * *', function () {
    updateCurrencies()
});

app.listen(PORT, () => {
    console.log(`running in port: ${PORT}`)
})