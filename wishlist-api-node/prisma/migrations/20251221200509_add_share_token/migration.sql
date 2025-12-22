/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `Wishlist` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Wishlist" ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_shareToken_key" ON "Wishlist"("shareToken");
