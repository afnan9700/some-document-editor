FROM golang:1.23-alpine AS build
WORKDIR /src

COPY go.mod ./
COPY . .
RUN go build -o /out/ws-server ./cmd/ws-server

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/ws-server /app/ws-server
EXPOSE 8081
ENTRYPOINT ["/app/ws-server"]
