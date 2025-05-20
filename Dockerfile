# Usa una imagen oficial de Node.js
FROM node:20

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia solo el contenido del backend
COPY Backend/ .

# Instala solo dependencias de producción
RUN npm install --omit=dev

# Expón el puerto
EXPOSE 3000

# Comando para ejecutar el servidor
CMD ["node", "config/server.js"]
