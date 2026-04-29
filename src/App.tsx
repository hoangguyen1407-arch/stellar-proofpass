import { useEffect, useState } from "react";
import "./App.css";
import {
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const server = new Horizon.Server(HORIZON_URL);

type EventPass = {
  id: number;
  passId: string;
  owner: string;
  eventName: string;
  attendeeName: string;
  ticketType: string;
  status: string;
  txHash: string;
  checkInTxHash?: string;
  createdAt: string;
  checkedInAt?: string;
};

function App() {
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState("0");

  const [eventName, setEventName] = useState("Stellar Vietnam Workshop");
  const [attendeeName, setAttendeeName] = useState("");
  const [ticketType, setTicketType] = useState("General");
  const [checkInPassId, setCheckInPassId] = useState("");

  const [passes, setPasses] = useState<EventPass[]>([]);
  const [status, setStatus] = useState("Idle");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);

  const backendUrl = "http://localhost:4000";

  useEffect(() => {
    loadPasses();

    const interval = setInterval(() => {
      loadPasses();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const connectWallet = async () => {
    try {
      setLoading(true);
      setStatus("Connecting wallet...");

      const connectedResult: any = await isConnected();
      const connected =
        typeof connectedResult === "boolean"
          ? connectedResult
          : connectedResult.isConnected;

      if (!connected) {
        setStatus("Error: Freighter wallet is not installed.");
        return;
      }

      const allowedResult: any = await isAllowed();
      const allowed =
        typeof allowedResult === "boolean"
          ? allowedResult
          : allowedResult.isAllowed;

      if (!allowed) {
        await requestAccess();
      }

      const addressResult: any = await getAddress();

      const address =
        typeof addressResult === "string"
          ? addressResult
          : addressResult.address || addressResult.publicKey;

      if (!address) {
        setStatus("Error: Could not get wallet address. Please unlock Freighter.");
        return;
      }

      setPublicKey(address);
      setStatus("Wallet connected. Loading balance...");

      await loadBalance(address);
    } catch (error) {
      console.error(error);
      setStatus("Error: User rejected wallet connection or wallet is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setPublicKey("");
    setBalance("0");
    setTxHash("");
    setStatus("Wallet disconnected.");
  };

  const loadBalance = async (address: string) => {
    try {
      const account = await server.loadAccount(address);

      const nativeBalance = account.balances.find(
        (item: any) => item.asset_type === "native"
      );

      setBalance(nativeBalance?.balance || "0");
      setStatus("Wallet connected successfully.");
    } catch (error) {
      console.error(error);
      setBalance("0");
      setStatus(
        "Wallet connected, but balance could not load. Please check Testnet and refresh."
      );
    }
  };

  const selectWallet = async (walletName: string) => {
    if (walletName !== "Freighter") {
      setStatus(`Error: ${walletName} is not available in this demo.`);
      return;
    }

    await connectWallet();
  };

  const buildAndSubmitManageDataTx = async (dataName: string, dataValue: string) => {
    const sourceAccount = await server.loadAccount(publicKey);

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.manageData({
          name: dataName.slice(0, 64),
          value: dataValue.slice(0, 64),
        })
      )
      .setTimeout(60)
      .build();

    const xdr = transaction.toXDR();

    const signedResult: any = await signTransaction(xdr, {
      networkPassphrase: Networks.TESTNET,
      address: publicKey,
    });

    const signedXdr =
      typeof signedResult === "string"
        ? signedResult
        : signedResult.signedTxXdr;

    const signedTransaction = TransactionBuilder.fromXDR(
      signedXdr,
      Networks.TESTNET
    );

    const result = await server.submitTransaction(signedTransaction);

    return result.hash;
  };

  const mintEventPass = async () => {
    try {
      if (!publicKey) {
        setStatus("Error: Please connect wallet first.");
        return;
      }

      if (!eventName.trim()) {
        setStatus("Error: Please enter event name.");
        return;
      }

      if (!attendeeName.trim()) {
        setStatus("Error: Please enter attendee name.");
        return;
      }

      if (!ticketType.trim()) {
        setStatus("Error: Please select ticket type.");
        return;
      }

      if (Number(balance) <= 0) {
        setStatus("Error: Insufficient XLM balance for transaction fee.");
        return;
      }

      setLoading(true);
      setTxHash("");
      setStatus("Pending: building event pass transaction...");

      const nextPassId = String(passes.length + 1);
      const dataName = `PASS:${nextPassId}`;
      const dataValue = `${eventName}-${attendeeName}-${ticketType}`;

      setStatus("Waiting for Freighter signature...");

      const hash = await buildAndSubmitManageDataTx(dataName, dataValue);

      setStatus("Saving event pass to backend...");

      await fetch(`${backendUrl}/api/passes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: publicKey,
          eventName,
          attendeeName,
          ticketType,
          passId: nextPassId,
          txHash: hash,
          status: "Not Checked-in",
        }),
      });

      setTxHash(hash);
      setStatus("Success: Event Pass minted.");
      setAttendeeName("");

      await loadPasses();
      await loadBalance(publicKey);
    } catch (error: any) {
      console.error(error);

      const message = String(error?.message || "").toLowerCase();

      if (message.includes("reject")) {
        setStatus("Error: User rejected transaction.");
      } else if (message.includes("insufficient")) {
        setStatus("Error: Insufficient balance.");
      } else {
        setStatus("Error: Event Pass mint failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const checkInPass = async () => {
    try {
      if (!publicKey) {
        setStatus("Error: Please connect wallet first.");
        return;
      }

      if (!checkInPassId.trim()) {
        setStatus("Error: Please enter Pass ID.");
        return;
      }

      const targetPass = passes.find(
        (item) => String(item.passId) === String(checkInPassId)
      );

      if (!targetPass) {
        setStatus("Error: Pass ID not found.");
        return;
      }

      if (targetPass.status === "Checked-in") {
        setStatus("Error: This pass is already checked-in.");
        return;
      }

      setLoading(true);
      setTxHash("");
      setStatus("Pending: building check-in transaction...");

      const dataName = `CHECKIN:${checkInPassId}`;
      const dataValue = "Checked-in";

      setStatus("Waiting for Freighter signature...");

      const hash = await buildAndSubmitManageDataTx(dataName, dataValue);

      setStatus("Updating check-in status in backend...");

      await fetch(`${backendUrl}/api/passes/${checkInPassId}/check-in`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txHash: hash,
        }),
      });

      setTxHash(hash);
      setStatus("Success: Event Pass checked-in.");
      setCheckInPassId("");

      await loadPasses();
      await loadBalance(publicKey);
    } catch (error: any) {
      console.error(error);

      const message = String(error?.message || "").toLowerCase();

      if (message.includes("reject")) {
        setStatus("Error: User rejected transaction.");
      } else {
        setStatus("Error: Check-in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPasses = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/passes`);
      const data = await response.json();
      setPasses(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="badge">Stellar Testnet dApp</p>
          <h1>Stellar ProofPass</h1>
          <p className="subtitle">
            Event attendance pass dApp on Stellar. Users can mint event passes,
            organizers can check in attendees, and all actions produce verifiable
            Testnet transaction hashes.
          </p>
        </div>

        <div className="wallet-card">
          <h2>Wallet</h2>

          <div className="wallet-options">
            <button onClick={() => selectWallet("Freighter")} disabled={loading}>
              Freighter
            </button>

            <button onClick={() => selectWallet("Albedo")} disabled={loading}>
              Albedo
            </button>

            <button
              onClick={() => selectWallet("WalletConnect")}
              disabled={loading}
            >
              WalletConnect
            </button>
          </div>

          {publicKey && (
            <button className="secondary-button" onClick={disconnectWallet}>
              Disconnect Wallet
            </button>
          )}

          <div className="info-box">
            <p>
              <strong>Public Key:</strong>
            </p>
            <p className="break-text">
              {publicKey || "Wallet is not connected yet."}
            </p>

            <p>
              <strong>XLM Balance:</strong> {balance}
            </p>
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Mint Event Pass</h2>
          <p className="muted">
            Create an event attendance pass for a participant.
          </p>

          <label>Event Name</label>
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Example: Stellar Vietnam Workshop"
          />

          <label>Attendee Name</label>
          <input
            value={attendeeName}
            onChange={(e) => setAttendeeName(e.target.value)}
            placeholder="Example: Nguyen Van A"
          />

          <label>Ticket Type</label>
          <select
            value={ticketType}
            onChange={(e) => setTicketType(e.target.value)}
          >
            <option value="General">General</option>
            <option value="VIP">VIP</option>
            <option value="Builder">Builder</option>
          </select>

          <button onClick={mintEventPass} disabled={loading}>
            {loading ? "Processing..." : "Mint Event Pass"}
          </button>
        </div>

        <div className="card">
          <h2>Organizer Check-in</h2>
          <p className="muted">
            Enter a Pass ID to mark the attendee as checked-in.
          </p>

          <label>Pass ID</label>
          <input
            value={checkInPassId}
            onChange={(e) => setCheckInPassId(e.target.value)}
            placeholder="Example: 1"
          />

          <button onClick={checkInPass} disabled={loading}>
            {loading ? "Processing..." : "Check-in Pass"}
          </button>
        </div>
      </section>

      <section className="status-box">
        <strong>Transaction Status:</strong> {status}
      </section>

      {txHash && (
        <section className="success-box">
          <h3>Latest Transaction Hash</h3>
          <p className="break-text">{txHash}</p>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View on Stellar Expert
          </a>
        </section>
      )}

      <section className="card wide-card">
        <h2>Event Pass Records</h2>
        <p className="muted">
          Records refresh automatically every 5 seconds to simulate real-time
          event updates.
        </p>

        {passes.length === 0 ? (
          <p>No event passes yet.</p>
        ) : (
          <div className="pass-list">
            {passes.map((pass) => (
              <div className="pass-item" key={pass.id}>
                <div className="pass-header">
                  <h3>{pass.eventName}</h3>
                  <span
                    className={
                      pass.status === "Checked-in"
                        ? "status checked"
                        : "status pending"
                    }
                  >
                    {pass.status}
                  </span>
                </div>

                <p>
                  <strong>Pass ID:</strong> {pass.passId}
                </p>

                <p>
                  <strong>Attendee:</strong> {pass.attendeeName}
                </p>

                <p>
                  <strong>Ticket Type:</strong> {pass.ticketType}
                </p>

                <p>
                  <strong>Owner:</strong>
                </p>
                <p className="break-text">{pass.owner}</p>

                <p>
                  <strong>Mint Tx:</strong>
                </p>
                <p className="break-text">{pass.txHash}</p>

                {pass.checkInTxHash && (
                  <>
                    <p>
                      <strong>Check-in Tx:</strong>
                    </p>
                    <p className="break-text">{pass.checkInTxHash}</p>
                  </>
                )}

                <p>
                  <strong>Created At:</strong> {pass.createdAt}
                </p>

                {pass.checkedInAt && (
                  <p>
                    <strong>Checked-in At:</strong> {pass.checkedInAt}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;