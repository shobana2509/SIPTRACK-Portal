const ARIMA = require('arima');

function predict(series) {
  try {
    const arima = new ARIMA({
      p: 1,
      d: 1,
      q: 1,
      verbose: false
    }).train(series);

    const [predictions] = arima.predict(1);
    return predictions[0];
  } catch (err) {
    return series[series.length - 1];
  }
}

const data1 = [100, 110, 120, 130, 140];
const data2 = [10, 20, 30, 40, 50];
const data3 = [100, 105, 110, 105, 120];

console.log('Data 1 [100...140]:', predict(data1));
console.log('Data 2 [10...50]:', predict(data2));
console.log('Data 3 [Non-linear]:', predict(data3));
