import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  const sdk = readFileSync(join(process.cwd(), 'src/lib/burnrate-sdk.ts'), 'utf8');
  return new NextResponse(sdk, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="burnrate-sdk.ts"',
    },
  });
}
