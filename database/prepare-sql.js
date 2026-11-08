
const fs = require("node:fs");

const inputFile = "it_ticketing_system.sql";
const outputFile = "it_ticketing_system_railway_final.sql";

try {
  let sql = fs.readFileSync(inputFile, "utf8");

  // 1. Hapus compatibility patch yang sebelumnya
  //    ditambahkan setelah COMMIT.
  const patchMarker =
    '\n-- 1. Tambahkan status "Tidak bisa diselesaikan"';

  const patchPosition = sql.indexOf(patchMarker);

  if (patchPosition !== -1) {
    sql = sql.slice(0, patchPosition).trimEnd() + "\n";
  }

  // 2. Perbarui ENUM status pada tiga kolom:
  //    tickets.status
  //    ticket_status_history.old_status
  //    ticket_status_history.new_status

  const oldEnum =
    "enum('Menunggu persetujuan','Belum dikerjakan','Sedang dikerjakan','Selesai')";

  const newEnum =
    "enum('Menunggu persetujuan','Belum dikerjakan','Sedang dikerjakan','Selesai','Tidak bisa diselesaikan')";

  const enumCount = sql.split(oldEnum).length - 1;

  if (enumCount !== 3) {
    throw new Error(
      `ENUM ditemukan ${enumCount} kali. Seharusnya 3 kali.`
    );
  }

  sql = sql.split(oldEnum).join(newEnum);

  // 3. Perbaiki status tiket WG-EE36B8D8.
  const oldTicket =
    "'Rendah', '', NULL, 2, '2026-11-05 11:11:02'";

  const newTicket =
    "'Rendah', 'Tidak bisa diselesaikan', NULL, 2, '2026-11-05 11:11:02'";

  const ticketCount = sql.split(oldTicket).length - 1;

  if (ticketCount !== 1) {
    throw new Error(
      `Record tiket yang akan diperbaiki ditemukan ${ticketCount} kali.`
    );
  }

  sql = sql.replace(oldTicket, newTicket);

  // 4. Tambahkan informasi penggunaan di bagian atas.
  const header = `-- ============================================================
-- IT TICKETING SYSTEM
-- FINAL DATABASE IMPORT - RAILWAY MYSQL
-- Prepared for DBeaver
--
-- PETUNJUK:
-- 1. Pilih schema Railway yang benar di DBeaver.
-- 2. Jalankan hanya pada database/schema kosong.
-- 3. File ini membuat 7 tabel dan mengimpor data.
-- 4. Data lampiran gambar tetap dipertahankan.
-- 5. Tidak ada CREATE DATABASE atau USE.
-- 6. Jalankan satu kali saja.
-- 7. File mengandung data pribadi dan hash password admin.
--    Simpan file ini secara privat.
-- ============================================================

`;

  sql = header + sql;

  // 5. Tambahkan query validasi di bagian paling akhir.
  const footer = `

-- ============================================================
-- IMPORT VALIDATION
-- ============================================================

SELECT 'admin_users' AS table_name, COUNT(*) AS total_rows
FROM admin_users
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'tickets', COUNT(*) FROM tickets
UNION ALL
SELECT 'ticket_attachments', COUNT(*) FROM ticket_attachments
UNION ALL
SELECT 'ticket_comments', COUNT(*) FROM ticket_comments
UNION ALL
SELECT 'ticket_pics', COUNT(*) FROM ticket_pics
UNION ALL
SELECT 'ticket_status_history', COUNT(*) FROM ticket_status_history;

SELECT
    ticket_number,
    status,
    resolution_result
FROM tickets
ORDER BY id;

`;

  sql = sql.trimEnd() + footer;

  // 6. Validasi struktur sebelum menyimpan.
  const tables = [
    "admin_users",
    "audit_logs",
    "tickets",
    "ticket_attachments",
    "ticket_comments",
    "ticket_pics",
    "ticket_status_history"
  ];

  for (const table of tables) {
    if (!sql.includes(`CREATE TABLE \`${table}\``)) {
      throw new Error(`Definisi tabel ${table} tidak ditemukan.`);
    }
  }

  if (sql.includes(oldEnum)) {
    throw new Error("Masih ditemukan ENUM status versi lama.");
  }

  if (!sql.includes(newTicket)) {
    throw new Error("Perbaikan status tiket tidak ditemukan.");
  }

  if (!sql.includes("0x89504e470d0a1a0a")) {
    throw new Error("Data binary lampiran gambar tidak ditemukan.");
  }

  if (/^\s*USE\s+/im.test(sql)) {
    throw new Error("File tidak boleh mengandung USE database.");
  }

  if (/^\s*CREATE\s+DATABASE/im.test(sql)) {
    throw new Error("File tidak boleh membuat database baru.");
  }

  // 7. Simpan file final.
  fs.writeFileSync(outputFile, sql, "utf8");

  console.log("==========================================");
  console.log("FINAL SQL BERHASIL DIBUAT");
  console.log("==========================================");
  console.log(`Output       : ${outputFile}`);
  console.log(`Ukuran       : ${fs.statSync(outputFile).size} bytes`);
  console.log(`Tabel        : ${tables.length}`);
  console.log(`ENUM updated : ${enumCount}`);
  console.log("Status tiket : Diperbaiki");
  console.log("Lampiran     : Dipertahankan");
  console.log("==========================================");

} catch (error) {
  console.error("GAGAL:", error.message);
  process.exitCode = 1;
}
