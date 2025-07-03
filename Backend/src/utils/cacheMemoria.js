const NodeCache = require("node-cache");

// stdTTL = 300 s  ⇒ los datos “viven” 5 min y luego se revalidan solos
const cacheMemoria = new NodeCache({ stdTTL: 300, checkperiod: 120 });

module.exports = cacheMemoria;

export default cacheMemoria; 