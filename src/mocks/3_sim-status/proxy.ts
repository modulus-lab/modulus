import { Request, Response } from 'express';
import { faker } from "@faker-js/faker";

export default function (req: Request, res: Response) {
  res.status(200).json({
    "mobileNumber": req.query.mobileNumber,
    "status": "SUCCESSFUL",
    "refId": faker.string.uuid(),
  });
}
