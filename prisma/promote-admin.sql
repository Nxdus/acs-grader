UPDATE "user"
SET "role" = 'ADMIN'
WHERE LOWER("email") IN (
  'paitong1550@gmail.com',
  'ittipat145@gmail.com'
);
