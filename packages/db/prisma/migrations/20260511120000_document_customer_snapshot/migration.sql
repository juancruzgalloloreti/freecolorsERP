ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "customerNameSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "customerCuitSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "customerPhoneSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "customerAddressSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "customerCitySnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "customerProvinceSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "customerIvaConditionSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryAddressSnapshot" TEXT;

