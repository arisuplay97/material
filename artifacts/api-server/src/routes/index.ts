import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import branchesRouter from "./branches";
import materialsRouter from "./materials";
import workOrdersRouter from "./workOrders";
import materialRequestsRouter from "./materialRequests";
import trackingsRouter from "./trackings";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(branchesRouter);
router.use(materialsRouter);
router.use(workOrdersRouter);
router.use(materialRequestsRouter);
router.use(trackingsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
