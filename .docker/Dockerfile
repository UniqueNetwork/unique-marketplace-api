FROM node:16-alpine
LABEL maintainer="Unique.Network"

WORKDIR /src

COPY ./package.json .

RUN npm install husky -g

RUN npm install --production

COPY . .

RUN npm run build


CMD ["npm", "run", "prod"]
