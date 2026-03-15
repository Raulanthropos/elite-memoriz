UPDATE "events"
SET "package" = 'PREMIUM'
WHERE "package" = 'PRO';

UPDATE "profiles"
SET "tier" = 'PREMIUM'
WHERE "tier" = 'PRO';
