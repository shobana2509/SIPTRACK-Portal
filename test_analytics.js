const http = require('http');

async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000/api${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Endpoint: /api${path}`);
        console.log(`Status: ${res.statusCode}`);
        try {
          console.log(`Result: ${JSON.stringify(JSON.parse(data), null, 2)}`);
        } catch (e) {
          console.log(`Raw data: ${data}`);
        }
        console.log('---');
        resolve();
      });
    }).on('error', (err) => {
      console.log(`Error on /api${path}: ${err.message}`);
      resolve(); // Don't crash
    });
  });
}

async function runTests() {
  console.log('Running backend analytics tests...\n');
  await testEndpoint('/stats/sipcot-comparison');
  await testEndpoint('/stats/usage-efficiency');
}

runTests();
