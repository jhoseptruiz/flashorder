FROM node:22-alpine

WORKDIR /app

# 1. Instalar pnpm
RUN npm install -g pnpm

# 2. Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# 3. Instalar TODO bloqueando los scripts (Esto evita que pnpm tire el error rojo)
RUN pnpm install --ignore-scripts

# 4. Forzar la construcción exclusiva de esbuild (necesario para que Vite funcione)
RUN pnpm rebuild esbuild

# 5. Copiar el resto del código
COPY . .

EXPOSE 5173

# 6. Ejecutar
CMD ["pnpm", "run", "dev", "--host"]