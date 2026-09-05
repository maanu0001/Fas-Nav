-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "arrivalByCar" TEXT,
ADD COLUMN     "arrivalByPublicTransport" TEXT,
ADD COLUMN     "arrivalMapUrl" TEXT,
ADD COLUMN     "arrivalNotes" TEXT,
ADD COLUMN     "arrivalTransportUrl" TEXT;
