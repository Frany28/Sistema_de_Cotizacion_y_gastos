# Usa una imagen oficial de Node.js
FROM node:20

# Crea una carpeta de trabajo en el contenedor
WORKDIR /app

# Copia el contenido del backend
COPY Backend/ .

# Instala las dependencias
RUN npm install

# Expone el puerto de tu servidor (usualmente 3000)
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["npm", "start"]
