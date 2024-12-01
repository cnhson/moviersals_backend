import express from "express";
import cors from "cors";
import publicRoutes from "./routes/public/index.js";
import privateRoutes from "./routes/private/index.js";
import internalRoutes from "./routes/internal/index.js";
import { isPrivileged, authenticateJWT } from "./middleware/index.js";
import cookieParser from "cookie-parser";
import { dbPool } from "./services/database.js";
import { sendResponse } from "./util/index.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.SERVER_HOST || "127.0.0.1";
const allowedOrigins = JSON.parse(process.env.ALLOW_ORIGINS);
app.set("trust proxy", true);
app.use(cookieParser());
app.use(
  express.urlencoded({
    extended: false,
  })
);
app.use(express.json());

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
  sendResponse(res, 200, "success", "success", "test");
});

// Invalid API path middleware
app.use((req, res) => {
  sendResponse(res, 404, "fail", "error", "Invalid API path");
});

app.listen(PORT, HOST, () => {
  console.log(`Server is running on port: ${PORT} ${HOST}`);
});
