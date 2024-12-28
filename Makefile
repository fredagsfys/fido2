.PHONY: install
install:
	@openssl req -x509 -out cmd/fido2-api/tls/development.crt -keyout cmd/fido2-api/tls/development.key \
			-newkey rsa:4096 -extensions EXT -nodes -sha256 \
			-subj '/CN=development' \
			-days 365 \
			-config cmd/fido2-api/tls/config.cnf

.PHONY: run
run:
	@go run ./cmd/fido2-api/main.go

.PHONY: build
build:
	@go build ./cmd/fido2-api/main.go

.PHONY: test
test:
	@go test -v -cover ./.../