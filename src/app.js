import express, { json } from "express";
import cors from "cors";
import publicRoutes from "./routes/public/index.js";
import privateRoutes from "./routes/private/index.js";
import internalRoutes from "./routes/internal/index.js";
import { isPrivileged, authenticateJWT } from "./middleware/index.js";
import { sendResponse } from "./util/index.js";
import cookieParser from "cookie-parser";
import { dbPool } from "./services/database.js";
import { WebSocketServer } from "ws";

// const wss = new WebSocketServer({
//   host: "0.0.0.0",
//   port: 8080,
//   perMessageDeflate: {
//     zlibDeflateOptions: {
//       // See zlib defaults.
//       chunkSize: 1024,
//       memLevel: 7,
//       level: 3,
//     },
//     zlibInflateOptions: {
//       chunkSize: 10 * 1024,
//     },
//     clientNoContextTakeover: true, // Defaults to negotiated value.
//     serverNoContextTakeover: true, // Defaults to negotiated value.
//     serverMaxWindowBits: 10, // Defaults to negotiated value.
//     concurrencyLimit: 10, // Limits zlib concurrency for perf.
//     threshold: 1024, // Size (in bytes) below which messages
//   },
// });

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.SERVER_HOST || "127.0.0.1";
const allowedOrigins = JSON.parse(process.env.ALLOW_ORIGINS);
app.set("trust proxy", true);
app.use(cookieParser());
app.use(json());

dbPool.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    if (process.env.DB_ONLINE_MODE != "true") {
      console.log("Local database connected");
    } else console.log("Supabase database connected");
  }
});

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

app.get("/favicon.ico", (req, res) => {
  res.sendStatus(204);
});
app.use("/api", publicRoutes);
app.use("/api/internal", authenticateJWT, isPrivileged, internalRoutes);
app.use("/api/protected", authenticateJWT, privateRoutes);
app.use("/test", (req, res) => {
  sendResponse(res, 200, "success", "test");
});

// Invalid API path middleware
app.use((req, res) => {
  sendResponse(res, 404, "fail", "Invalid API path");
});

// let activeChannels = new Set();
// activeChannels.add("livestream_channel");
// activeChannels.add("notification_channel");
// wss.on("connection", (ws, req) => {
//   //_________ ws://localhost:8080?feature=livestream&livestreamId=123
//   let heartbeatTimeout;
//   const params = new URLSearchParams(req.url.slice(1)); // Remove the leading "/"

//   console.log("cookie: ", req.headers.cookie);
//   const feature = params.get("feature");
//   const livestreamId = params.get("livestreamId");

//   console.log(`New connection: feature=${feature}, livestreamId=${livestreamId}`);

//   if (feature === "livestream" && livestreamId) {
//     console.log(`User connected to livestream ${livestreamId}`);
//   } else {
//     console.log("Invalid feature or livestreamId");
//     ws.close(4000, "Invalid feature or livestreamId");
//     return;
//   }

//   ws.on("close", (code, reason) => {
//     console.log(`Connection closed with code: ${code}, reason: ${reason}`);
//   });

//   ws.on("message", (message) => {
//     console.log("Received message:", message.toString());

//     const jsonmessage = JSON.parse(message.toString());

//     if (jsonmessage?.type === "ping") {
//       clearTimeout(heartbeatTimeout);
//       heartbeatTimeout = setTimeout(() => {
//         console.log(`User disconnected due to heartbeat timeout from livestream ${livestreamId}`);
//       }, 5000);
//     }
//   });
//   // Optionally, send a message to confirm connection
//   ws.send(
//     JSON.stringify({
//       type: "connected_user",
//       data: { message: "Connection established" },
//     })
//   );
// });

app.listen(PORT, HOST, () => {
  console.log(`Server is running on port: ${PORT} ${HOST}`);
});
