# FIDO2 Passkey Demo

## Quick Start
```bash
go run cmd/fido2-api/main.go
```
Open http://localhost:8080

## With ngrok (mobile passkeys)
```bash
ngrok http 8080
RP_ID=abc123.ngrok-free.dev RP_ORIGIN=https://abc123.ngrok-free.dev go run cmd/fido2-api/main.go
```
Replace `abc123.ngrok-free.dev` with your ngrok URL.

## Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `RP_ID` | `localhost` | WebAuthn Relying Party ID (domain) |
| `RP_ORIGIN` | `http://localhost:8080` | Allowed origin for WebAuthn |
| `PORT` | `8080` | Server port |

## Demo
https://github.com/user-attachments/assets/7f6ec3dc-4697-4bc2-a303-79a3efa82433

