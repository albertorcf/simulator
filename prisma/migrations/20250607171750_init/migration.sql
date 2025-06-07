-- CreateTable
CREATE TABLE "Symbol" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,

    CONSTRAINT "Symbol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kline" (
    "symbolId" INTEGER NOT NULL,
    "time" BIGINT NOT NULL,
    "open" BIGINT NOT NULL,
    "close" BIGINT NOT NULL,
    "high" BIGINT NOT NULL,
    "low" BIGINT NOT NULL,
    "volume" BIGINT NOT NULL,

    CONSTRAINT "Kline_pkey" PRIMARY KEY ("symbolId","time")
);

-- CreateIndex
CREATE UNIQUE INDEX "Symbol_symbol_key" ON "Symbol"("symbol");

-- AddForeignKey
ALTER TABLE "Kline" ADD CONSTRAINT "Kline_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "Symbol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
