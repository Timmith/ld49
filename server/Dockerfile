FROM rust:alpine

EXPOSE 80

COPY . /app

WORKDIR /app

ENTRYPOINT ["cargo", "run", "--release"]
