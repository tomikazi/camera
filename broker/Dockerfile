FROM node:alpine
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production

COPY ["package.json", "package-lock.json*", "broker.js", "./"]
COPY ["lib", "./lib"]
COPY ["public", "./public"]

RUN npm install --production
CMD [ "node", "broker.js" ]