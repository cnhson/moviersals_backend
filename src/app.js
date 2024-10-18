import express, { json } from "express";
import cors from "cors";
import publicRoutes from "./routes/public/index.js";
import privateRoutes from "./routes/private/index.js";
import { authenticateJWT } from "./middleware/jwtverify.js";
import { sendResponse } from "./global/index.js";
import cookieParser from "cookie-parser";
import { dbPool } from "./services/database.js";
import multer from "multer";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.SERVER_HOST || "127.0.0.1";
// Specific domain
const allowedOrigins = JSON.parse(process.env.ALLOW_ORIGINS);
app.set("trust proxy", true);
app.use(cookieParser());
app.use(json());
app.use(cors());
const upload = multer({ dest: "uploads/" });

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

app.use("/api", publicRoutes);
app.use("/api/protected", authenticateJWT, privateRoutes);
app.use("/test", (req, res) => {
  sendResponse(res, 200, "success", "test");
});

app.use("/wat", (req, res) => {
  return res.redirect("/login");
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

app.listen(PORT, HOST, () => {
  console.log(`Server is running on port: ${PORT} ${HOST}`);
});
