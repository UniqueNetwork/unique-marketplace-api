FROM node:16-alpine
RUN mkdir -p /var/www/api
WORKDIR /var/www/api
ADD . /var/www/api

RUN npm install --production

RUN npm run build

RUN cp -r /src/src/blockchain /src/dist/blockchain

CMD ["npm", "run", "prod"]
