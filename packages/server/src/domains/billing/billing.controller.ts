import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./billing.service";

export const status = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.getStatus(req.userId!));
});

export const units = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.listUnits(req.userId!));
});

export const setUnitActive = wrapAsync(async (req: Request, res: Response) => {
  res.json(
    await service.setUnitActive(
      req.userId!,
      req.params.unitType,
      req.params.unitId,
      req.body.active,
    ),
  );
});

export const stripeCheckout = wrapAsync(async (req: Request, res: Response) => {
  const url = await service.createStripeCheckout(req.userId!, req.body.plan);
  res.status(201).json({ url });
});

export const stripePortal = wrapAsync(async (req: Request, res: Response) => {
  const url = await service.createStripePortal(req.userId!);
  res.status(201).json({ url });
});

export const googlePlayPurchase = wrapAsync(
  async (req: Request, res: Response) => {
    await service.verifyGooglePlayPurchase(req.userId!, req.body.purchaseToken);
    res.status(204).end();
  },
);

export const stripeWebhook = wrapAsync(async (req: Request, res: Response) => {
  const signature = req.header("stripe-signature");
  if (!signature || !Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: { code: "INVALID_WEBHOOK" } });
    return;
  }
  await service.handleStripeWebhook(req.body, signature);
  res.json({ received: true });
});

export const googlePlayRtdn = wrapAsync(async (req: Request, res: Response) => {
  await service.handleGooglePlayRtdn(req.header("authorization"), req.body);
  res.status(204).end();
});
