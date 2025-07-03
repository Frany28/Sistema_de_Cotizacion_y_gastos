// Backend/src/utils/cacheMemoria.js  (versión ES Modules)
import NodeCache from "node-cache";

const cacheMemoria = new NodeCache({
  stdTTL: 300, // 5 min
  checkperiod: 120, // purga cada 2 min
});

export default cacheMemoria;
