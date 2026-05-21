export type ResponseTrace = {
  request_id: string;
  timestamp: string;
};

const toRequestId = (request: Request) => {
  const byHeader = request.headers.get('X-Request-Id')?.trim();
  if (byHeader) {
    return byHeader.slice(0, 160);
  }

  const byCfRay = request.headers.get('CF-Ray')?.trim();
  if (byCfRay) {
    return `cf-${byCfRay.slice(0, 120)}`;
  }

  return crypto.randomUUID();
};

export const createResponseTrace = (request: Request): ResponseTrace => ({
  request_id: toRequestId(request),
  timestamp: new Date().toISOString(),
});
