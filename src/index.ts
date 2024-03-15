import CurrencyCodes from 'currency-codes'; 
import cors from 'cors';
import express from 'express';
import { MongoClient } from "mongodb";

import 'dotenv/config';

const port = process.env.PORT || 3001;

const app = express();

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const client = new MongoClient(process.env.MONGO_URI as string);

app.post('/update', async (req, res) => {
  const { country, currency, status } = req.body;
  let filterValue, collection;

  await client.connect();

  if (country) {
    collection = client.db().collection("countries");
    filterValue = country;
  } else if (currency) {
    collection = client.db().collection("currencies");
    filterValue = currency;
  } else {
    return res.end('Invalid or empty update data');
  }

  await collection.updateOne({
    name: filterValue,
  }, {
    $set: {
      disabled: !status,
    },
  }, {
    upsert: true,
  });

  res.end();
});

app.get('/', async (req, res) => {
  await client.connect();

  const countriesCollection = client.db().collection<{ name: string; }>("countries");
  const currenciesCollection = client.db().collection<{ name: string; }>("currencies");

  const disabledCountries: string[] = [];
  const disabledCurrencies: string[] = [];

  for await (const item of countriesCollection.find({ disabled: true })) {
    disabledCountries.push(item.name);
  }

  for await (const item of currenciesCollection.find({ disabled: true })) {
    disabledCurrencies.push(item.name);
  }

  const countriesMap = CurrencyCodes.countries().reduce((acc, country) => {
    acc[country] = {
      currencies: CurrencyCodes.data.filter((currency) => currency.countries.includes(country)).map((currency) => currency.code)
    };

    if (disabledCountries.includes(country)) {
      acc[country].disabled = true;
    }

    return acc;
  }, {} as {
    [key: string]: {
      currencies: string[];
      disabled?: boolean;
    },
  });

  const currenciesMap = CurrencyCodes.codes().reduce((acc, code) => {
    acc[code] = {
      countries: CurrencyCodes.data.find((currency) => currency.code === code)?.countries
    };

    if (disabledCurrencies.includes(code)) {
      acc[code].disabled = true;
    }

    return acc;
  }, {} as {
    [key: string]: {
      countries?: string[];
      disabled?: boolean;
    },
  });
  
  res.json({
    countriesMap,
    currenciesMap,
  });
});

app.listen(port, () => {
  console.info('Server started on port', port);
});