import { Request, Response, NextFunction } from "express";

export interface MockResponseResult {
  status: number;
  data: any;
}

/**
 * Invokes an Express controller function with simulated request, response, and next handlers,
 * returning a Promise that resolves on res.json() / res.send() and rejects on next(err).
 */
export function invokeController(
  controllerFn: (req: Request, res: Response, next: NextFunction) => Promise<any> | any,
  req: Partial<Request>
): Promise<MockResponseResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let statusCode = 200;
    let responseData: any = null;

    const res: any = {
      headers: {} as Record<string, string>,
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(data: any) {
        responseData = data;
        if (!settled) {
          settled = true;
          resolve({ status: statusCode, data });
        }
        return res;
      },
      send(data: any) {
        responseData = data;
        if (!settled) {
          settled = true;
          resolve({ status: statusCode, data });
        }
        return res;
      },
      setHeader(k: string, v: string) {
        res.headers[k] = v;
      },
    };

    const next: NextFunction = ((err?: any) => {
      if (!settled) {
        settled = true;
        if (err) {
          reject(err);
        } else {
          resolve({ status: statusCode, data: responseData });
        }
      }
    }) as NextFunction;

    try {
      const result = controllerFn(req as Request, res as Response, next);
      if (result && typeof result.then === "function") {
        result.catch((asyncErr: any) => {
          if (!settled) {
            settled = true;
            reject(asyncErr);
          }
        });
      }
    } catch (syncErr) {
      if (!settled) {
        settled = true;
        reject(syncErr);
      }
    }
  });
}
