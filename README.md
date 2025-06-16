# Sistema de Cotización y Control de Gastos

Monorepo Node + React que gestiona clientes, cotizaciones, gastos y solicitudes de pago.  Incluye: API REST (Express + MySQL + S3) y SPA (React + Vite).  Listo para desarrollo local, contenedores Docker y despliegue (Netlify + Railway/Render).

# Estructura del proyecto
/
├─ Backend/              # API REST – Express, Sequelize
│  ├─ src/
│  ├─ package.json       # scripts, dependencias
│  └─ Dockerfile         # runtime (multi‑stage) ①
│
├─ Frontend/             # SPA React – Vite + Tailwind
│  ├─ src/
│  ├─ vite.config.js
│  ├─ package.json       # scripts, dependencias
│  └─ Dockerfile         # Nginx con build estático ② (opcional)
│
├─ docker-compose.yml    # desarrollo local (MySQL + API + Web)
├─ netlify.toml          # build para Netlify (solo Frontend)
└─ README.md

# Requisitos previos

Herramienta

Versión recomendada

Node.js ≥ 20 LTS

npm ≥ 10

Docker & Docker Compose (para entorno contenedorizado)

MySQL 8 .x 

# Variables de entorno

# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=sistema_cotizacion

# Sesiones
SESSION_SECRET=unSecretoMuyFuerte
FRONTEND_URL=http://localhost:5173       # CORS

# AWS S3 – facturas, comprobantes, firmas
AWS_ACCESS_KEY_ID=xxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxx
AWS_REGION=us-east-1
S3_BUCKET=sistema-cotizacion-gastos

# Puppeteer (chromium sin sandbox)
CHROMIUM_PATH=/usr/bin/chromium-browser  # solo en Docker

# Frontend
VITE_API_URL=http://localhost:3000/api

# Instalación local 
# Clonar
$ git clone https://github.com/Frany28/Sistema_de_Cotizacion_y_gastos.git
$ cd Sistema_de_Cotizacion_y_gastos

# Backend
$ cd Backend && npm install
$ npm run dev         # nodemon src/server.js (puerto 3000)

# Nueva terminal – Frontend
$ cd ../Frontend && npm install
$ npm run dev         # Vite (puerto 5173)

#  Scripts npm relevantes

# Backend

npm run dev

npm start

npm run lint

# Frontend

npm run dev

npm run build

npm run preview

# Despliegue

# Frontend

Netlify

Conectar repo → Base =Frontend / Build =npm run build / Publish =dist

# Backend

Vercel

# Base de datos

AWS S3
