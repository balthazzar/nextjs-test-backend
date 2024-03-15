FROM node:18-alpine

WORKDIR /

COPY package.json package-lock.json* ./
RUN npm ci

COPY src ./src
COPY tsconfig.json .

RUN npm run build

CMD npm run start