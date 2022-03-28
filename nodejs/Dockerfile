FROM alpine
RUN apk add --update nodejs npm
WORKDIR /usr/src/app
EXPOSE 3000
EXPOSE 5672
COPY src/ .
RUN ls -la /usr/src/app/*
RUN npm install express mongoose
RUN npm install pm2 -g
RUN npm install amqplib
RUN npm install os
CMD [ "pm2-runtime", "app.js","--watch" ]

