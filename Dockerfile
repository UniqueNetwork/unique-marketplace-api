FROM node:16-alpine

WORKDIR /src

COPY ./package.json .

RUN npm install --production

COPY . .

RUN npm run build

RUN cp -r /src/src/blockchain /src/dist/blockchain

CMD ["npm", "run", "prod"]
