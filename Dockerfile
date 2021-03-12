# Build stage
FROM node:14-alpine as build-stage

WORKDIR /usr/src/app/server

COPY package.json package.json

RUN yarn install
RUN yarn global add typescript
RUN mkdir ./dist

COPY . .

RUN tsc --outDir dist/ --project tsconfig.json

# Production stage
FROM node:14-alpine

COPY --from=build-stage /usr/src/app/server/dist /usr/src/app/server
COPY --from=build-stage /usr/src/app/server/node_modules /usr/src/app/server/node_modules
COPY --from=build-stage /usr/src/app/server/src/config.example.json /usr/src/app/server/config.json

WORKDIR /usr/src/app/server

CMD ["node", "index.js"]
