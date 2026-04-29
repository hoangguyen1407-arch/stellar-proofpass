const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

let passes = [];

app.get("/", (req, res) => {
  res.json({
    message: "Stellar ProofPass Backend is running",
  });
});

app.get("/api/passes", (req, res) => {
  res.json(passes);
});

app.post("/api/passes", (req, res) => {
  const {
    owner,
    eventName,
    attendeeName,
    ticketType,
    passId,
    txHash,
    status,
  } = req.body;

  if (!owner || !eventName || !attendeeName || !ticketType || !txHash) {
    return res.status(400).json({
      error: "Missing required pass fields",
    });
  }

  const newPass = {
    id: passes.length + 1,
    passId: passId || String(passes.length + 1),
    owner,
    eventName,
    attendeeName,
    ticketType,
    status: status || "Not Checked-in",
    txHash,
    createdAt: new Date().toISOString(),
  };

  passes.unshift(newPass);

  res.status(201).json(newPass);
});

app.patch("/api/passes/:passId/check-in", (req, res) => {
  const { passId } = req.params;
  const { txHash } = req.body;

  const foundPass = passes.find((item) => String(item.passId) === String(passId));

  if (!foundPass) {
    return res.status(404).json({
      error: "Pass not found",
    });
  }

  foundPass.status = "Checked-in";
  foundPass.checkInTxHash = txHash || "";
  foundPass.checkedInAt = new Date().toISOString();

  res.json(foundPass);
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});