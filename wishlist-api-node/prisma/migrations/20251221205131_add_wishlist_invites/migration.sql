-- CreateTable
CREATE TABLE "WishlistInvite" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "wishlistId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GroupToWishlistInvite" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "WishlistInvite_token_key" ON "WishlistInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "_GroupToWishlistInvite_AB_unique" ON "_GroupToWishlistInvite"("A", "B");

-- CreateIndex
CREATE INDEX "_GroupToWishlistInvite_B_index" ON "_GroupToWishlistInvite"("B");

-- AddForeignKey
ALTER TABLE "WishlistInvite" ADD CONSTRAINT "WishlistInvite_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupToWishlistInvite" ADD CONSTRAINT "_GroupToWishlistInvite_A_fkey" FOREIGN KEY ("A") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupToWishlistInvite" ADD CONSTRAINT "_GroupToWishlistInvite_B_fkey" FOREIGN KEY ("B") REFERENCES "WishlistInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
