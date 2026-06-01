FROM node:22-alpine

WORKDIR /app

# 1. Instalar pnpm globalmente en el contenedor
RUN npm install -g pnpm

# 2. Copiar los archivos de configuración de pnpm
COPY package.json pnpm-lock.yaml ./

# 3. Instalar dependencias usando pnpm (más rápido y limpio)
RUN pnpm install

# 4. Copiar el resto de tu código
COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]