# Stage 1: Build
FROM rust:1.85-slim-bookworm AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release && \
    cp target/release/cmp-backend /app/cmp-backend && \
    rm -rf target

# Stage 2: Runtime
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

RUN adduser --system --no-create-home appuser
USER appuser

WORKDIR /app
COPY --from=builder /app/cmp-backend /app/

EXPOSE 3101

CMD ["./cmp-backend"]
