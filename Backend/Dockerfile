# Usa Node.js como base
FROM node:20

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia el contenido de la carpeta Backend dentro del contenedor
COPY Backend/ .

# Instala solo las dependencias de producción
RUN npm install --omit=dev

# Expón el puerto del servidor
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["npm", "start"]
