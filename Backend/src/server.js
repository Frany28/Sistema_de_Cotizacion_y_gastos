// backend/src/server.js
import app from "./app.js"; // Tu Express “app” configurada en src/app.js

const PORT = process.env.PORT || 3000; // Usa el puerto de env o 3000 por defecto

app.listen(PORT, () => {
  console.log(
    `Servidor de desarrollo escuchando en http://localhost:${PORT}`
  );
});
