# Stellar ProofPass

## 1. Project Introduction

**Stellar ProofPass** is an event attendance pass dApp built on **Stellar Testnet**.

The project allows users to connect a wallet, mint an event pass, check in attendees, track transaction status, and view event pass records in real time.

This project includes:

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express
- Wallet: Freighter
- Network: Stellar Testnet

---

## 2. Main Features

- Multi-wallet UI options: Freighter, Albedo, WalletConnect
- Freighter wallet connection
- Display wallet public key and XLM balance
- Mint event attendance pass
- Organizer check-in flow
- Transaction status display
- Transaction hash with Stellar Expert link
- Backend API to store event pass records
- Real-time event pass record refresh every 5 seconds
- Error handling for wallet, balance, and transaction issues

---

## 3. User Flow

### Mint Event Pass

1. User opens Stellar ProofPass.
2. User connects Freighter wallet on Stellar Testnet.
3. App displays public key and XLM balance.
4. User enters event name, attendee name, and ticket type.
5. User clicks **Mint Event Pass**.
6. User signs the transaction in Freighter.
7. App displays transaction status and transaction hash.
8. Event pass appears in the records list with status **Not Checked-in**.

### Organizer Check-in

1. Organizer enters the Pass ID.
2. Organizer clicks **Check-in Pass**.
3. User signs the check-in transaction in Freighter.
4. App updates the pass status to **Checked-in**.
5. App displays the check-in transaction hash and checked-in time.

---

## 4. Error Handling

The app handles these error types:

1. Wallet not installed or wallet not connected
2. User rejects wallet connection or transaction signing
3. Insufficient XLM balance or transaction failure
4. Invalid Pass ID or already checked-in pass

---

## 5. Screenshots

## Final Note

This project demonstrates event pass minting and organizer check-in on Stellar Testnet.