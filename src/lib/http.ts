import { NextResponse } from "next/server";

const UTF8_JSON = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

export function jsonOk<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: UTF8_JSON,
  });
}

export function jsonError(error: string, status = 500) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: UTF8_JSON,
    },
  );
}
