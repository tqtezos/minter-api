-- CreateTable
CREATE TABLE "BigMapKey" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bigMapId" INTEGER NOT NULL,
    "keyString" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "count" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "BigMapKey.bigMapId_keyString_unique" ON "BigMapKey"("bigMapId", "keyString");
