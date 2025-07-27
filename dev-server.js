import app from './server.js';

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Get local IP address for mobile testing
import { networkInterfaces } from 'os';

const getLocalIP = () => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};

const localIP = getLocalIP();

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📱 Mobile: http://${localIP}:${PORT}`);
  console.log(`🌐 Health check: http://${localIP}:${PORT}/api/health`);
  console.log(`📤 Upload test: http://${localIP}:${PORT}/api/upload/image`);
  console.log(`\n📋 For mobile testing:`);
  console.log(`   1. Connect your phone to the same WiFi network`);
  console.log(`   2. Open http://${localIP}:5173 on your phone`);
  console.log(`   3. Install the PWA from your mobile browser`);
});