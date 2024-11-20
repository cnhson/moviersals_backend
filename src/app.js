import express, { json } from "express";
import cors from "cors";
import publicRoutes from "./routes/public/index.js";
import privateRoutes from "./routes/private/index.js";
import internalRoutes from "./routes/internal/index.js";
import { isPrivileged, authenticateJWT } from "./middleware/index.js";
import { sendResponse } from "./util/index.js";
import cookieParser from "cookie-parser";
import { dbPool } from "./services/database.js";
import fs from "fs";
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({
  host: "0.0.0.0",
  port: 8080,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3,
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024,
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024, // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
  },
});

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.SERVER_HOST || "127.0.0.1";
// Specific domain
const allowedOrigins = JSON.parse(process.env.ALLOW_ORIGINS);
app.set("trust proxy", true);
app.use(cookieParser());
app.use(json());

/* CROS middleware */
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
// app.use(function (req, res, next) {
//   const origin = req.headers.origin;
//   if (allowedOrigins.includes(origin)) {
//     res.setHeader("Access-Control-Allow-Origin", origin);
//   }

//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });
app.get("/favicon.ico", (req, res) => {
  res.sendStatus(204);
});
app.use("/api", publicRoutes);
app.use("/api/internal", authenticateJWT, isPrivileged, internalRoutes);
app.use("/api/protected", authenticateJWT, privateRoutes);
app.use("/test", (req, res) => {
  console.log({
    total: dbPool.totalCount, // Total clients in the pool
    idle: dbPool.idleCount, // Clients currently idle in the pool
    waiting: dbPool.waitingCount, // Clients currently waiting for a connection
  });

  sendResponse(res, 200, "success", "test");
});

app.use("/dir", (req, res) => {
  const currentDir = process.cwd();
  let result;
  // Read the contents of the directory
  fs.readdir(currentDir, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return;
    }

    if (files.length === 0) {
      console.log("No files or directories found in the current directory.");
    } else {
      // Filter and list only files
      result = files.filter((file) => file.isDirectory()).map((file) => file.name);
      console.log("Files in the current directory:", result);
    }
  });
  sendResponse(res, 200, "success", result);
});

// Invalid API path middleware
app.use((req, res) => {
  sendResponse(res, 404, "fail", "Invalid API path");
});

dbPool.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    if (process.env.DB_ONLINE_MODE != "true") {
      console.log("Local database connected");
    } else console.log("Supabase database connected");
  }
});

const clients = {};
wss.on("connection", (ws) => {
  console.log("New client connected");

  // Handle incoming messages
  ws.on("message", (message) => {
    const parsedMessage = JSON.parse(message.toString());

    switch (parsedMessage.type) {
      case "connected_user":
        console.log("Received connected user data:", parsedMessage.data);
        // Handle connected_user data (e.g., store user info in a session)
        break;

      case "message":
        console.log("Received message data:", parsedMessage.data);
        // Handle chat message, broadcast it, etc.
        break;

      default:
        console.log("Unknown message type:", parsedMessage.type);
    }
  });

  // Optionally, send a message to confirm connection
  ws.send(
    JSON.stringify({
      type: "connected_user",
      data: { message: "Connection established" },
    })
  );
});

app.listen(PORT, HOST, () => {
  console.log(`Server is running on port: ${PORT} ${HOST}`);
});
