FROM node:16-alpine

WORKDIR /src

COPY ./package.json .

RUN npm install --production

COPY . .

RUN npm run build


CMD ["npm", "run", "prod"]
