const os = require('os');
const ifaces = os.networkInterfaces();
let bestIp = '10.0.2.2'; // fallback

for (let dev in ifaces) {
    if (dev.toLowerCase().includes('vbox') || dev.toLowerCase().includes('vmware') || dev.toLowerCase().includes('wsl')) continue;

    ifaces[dev].forEach(function (details) {
        if (details.family === 'IPv4' && !details.internal) {
            if (details.address.startsWith('192.168.')) {
                bestIp = details.address;
            } else if (bestIp === '10.0.2.2' && details.address.startsWith('10.')) {
                bestIp = details.address;
            }
        }
    });
}
console.log(bestIp);
