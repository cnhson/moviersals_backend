import { Router } from "express";
import * as funcs from "../../controller/episodeCon.js";

const router = Router();

router.post("/increaseview", funcs.increaseEpisodeView);

export default router;
