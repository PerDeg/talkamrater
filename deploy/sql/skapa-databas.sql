-- Kör EN av delarna nedan som admin i din befintliga databasserver.
-- Tabellerna skapas automatiskt av servern vid första start.

-- ---------- PostgreSQL ----------
CREATE USER talkamrater WITH PASSWORD 'byt-losenord';
CREATE DATABASE talkamrater OWNER talkamrater;
-- Vill du hellre lägga tabellerna i en befintlig databas:
--   GRANT CREATE, USAGE ON SCHEMA public TO talkamrater;

-- ---------- MySQL / MariaDB ----------
-- CREATE DATABASE talkamrater CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CREATE USER 'talkamrater'@'%' IDENTIFIED BY 'byt-losenord';
-- GRANT ALL PRIVILEGES ON talkamrater.* TO 'talkamrater'@'%';
-- FLUSH PRIVILEGES;
