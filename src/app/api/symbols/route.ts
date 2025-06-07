// apps/simulator/src/app/api/symbols/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const symbols = await prisma.symbol.findMany();
  return NextResponse.json(symbols);
}

export async function POST(req: NextRequest) {
  const { symbol, descr } = await req.json(); // Adicionar descr aqui
  const data: { symbol: string; descr?: string } = { symbol };
  if (descr !== undefined) {
    data.descr = descr;
  }
  const created = await prisma.symbol.create({ data });
  return NextResponse.json(created, { status: 201 });
}