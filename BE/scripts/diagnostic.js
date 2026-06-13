const http = require('http');

console.log("Triggering Python STT service directly via standard http...");

const payload = JSON.stringify({
  audio_path: "D:\\kuliahyangbetul\\19MJ\\BE\\storage\\interviews\\13\\media-1779630362123.webm"
});

const options = {
  hostname: '127.0.0.1',
  port: 8001,
  path: '/transcribe',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Python STT Response:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(payload);
req.end();
