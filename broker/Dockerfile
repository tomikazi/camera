FROM node:12.18.1

ENV NODE_ENV=production

COPY ["package.json", "package-lock.json*", "broker.js", "./"]
COPY ["lib", "./lib"]
COPY ["public", "./public"]

RUN npm install --production
CMD [ "node", "broker.js" ]