#!/usr/bin/env tsx
/**
 * Dev seed script — Kasus Korupsi Pengadaan Alat PCR, RSUD Kabupaten Tambora.
 *
 * Usage: pnpm seed:dev --email <your-dev-email>
 *
 * Idempotent: all IDs are fixed `seed_*` strings; rows upsert on conflict.
 * Targets an existing user (created via sign-up). Does not create new users.
 *
 * Note: all repos insert revision rows before main rows, which violates the
 * non-deferrable FK on first insert. This script bypasses repo.save() and
 * writes main → revision directly to avoid that ordering issue.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BahasaText,
  Case,
  Entity,
  Excerpt,
  RightOfReply,
  Source,
} from '@kawal/domain';
import { DrizzleUserRepo, createDb, schema } from '@kawal/infrastructure';

// ---------- env loading ----------

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

// Try both workspace-root and backend-dir contexts
loadEnvFile(resolve(process.cwd(), 'apps/backend/.env'));
loadEnvFile(resolve(process.cwd(), '.env'));

// ---------- arg parsing ----------

const emailArg = (() => {
  const idx = process.argv.indexOf('--email');
  return idx === -1 ? undefined : process.argv[idx + 1];
})();

if (!emailArg) {
  console.error('Usage: pnpm seed:dev --email <dev-user-email>');
  process.exit(1);
}

// ---------- DB ----------

const DATABASE_URL = process.env['DATABASE_URL'];
const DATABASE_TYPE = (process.env['DATABASE_TYPE'] ?? 'postgres') as 'postgres' | 'sqlite';

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Make sure apps/backend/.env exists.');
  process.exit(1);
}

const { db, close } = createDb(DATABASE_URL, DATABASE_TYPE);
const userRepo = new DrizzleUserRepo(db);

const {
  sources,
  sourcesRevisions,
  entities,
  entitiesRevisions,
  cases,
  casesRevisions,
  events,
  eventsRevisions,
  claims,
  claimsRevisions,
  relationships,
  relationshipsRevisions,
} = schema;

// ---------- helpers: main row first, then revision ----------

const NOW = new Date('2024-11-15T09:00:00Z');

async function seedSource(s: Source, now = NOW): Promise<void> {
  await db.insert(sources).values({
    id: s.id,
    ownerUserId: s.ownerUserId,
    url: s.url,
    publisher: s.publisher,
    tier: s.tier,
    fetchedAt: s.fetchedAt,
    excerpt: s.excerpt.value,
    archiveUrl: s.archiveUrl,
    bodyHash: s.bodyHash,
    currentRevisionNo: 1,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: sources.id,
    set: { excerpt: s.excerpt.value, archiveUrl: s.archiveUrl, updatedAt: now },
  });
  await db.insert(sourcesRevisions).values({
    aggregateId: s.id,
    revisionNo: 1,
    validFrom: now,
    validTo: null,
    actorUserId: s.ownerUserId,
    changeKind: 'created',
    payload: {
      url: s.url, publisher: s.publisher, tier: s.tier,
      fetchedAt: s.fetchedAt.toISOString(), excerpt: s.excerpt.value,
      archiveUrl: s.archiveUrl, bodyHash: s.bodyHash,
    },
  }).onConflictDoNothing();
}

async function seedEntity(e: Entity, now = NOW): Promise<void> {
  await db.insert(entities).values({
    id: e.id,
    ownerUserId: e.ownerUserId,
    type: e.type,
    canonicalName: e.canonicalName,
    aliases: [...e.aliases],
    description: e.description.value,
    publicFigure: e.publicFigure,
    profile: e.profile as Record<string, unknown>,
    currentRevisionNo: 1,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: entities.id,
    set: { canonicalName: e.canonicalName, description: e.description.value, updatedAt: now },
  });
  await db.insert(entitiesRevisions).values({
    aggregateId: e.id,
    revisionNo: 1,
    validFrom: now,
    validTo: null,
    actorUserId: e.ownerUserId,
    changeKind: 'created',
    payload: {
      type: e.type, canonicalName: e.canonicalName, aliases: [...e.aliases],
      description: e.description.value, publicFigure: e.publicFigure, profile: e.profile,
    },
  }).onConflictDoNothing();
}

async function seedCaseRevision(
  kasus: Case,
  revisionNo: number,
  validFrom: Date,
  validTo: Date | null,
  uid: string,
): Promise<void> {
  await db.insert(casesRevisions).values({
    aggregateId: kasus.id,
    revisionNo,
    validFrom,
    validTo,
    actorUserId: uid,
    changeKind: revisionNo === 1 ? 'created' : 'updated',
    payload: {
      name: kasus.name, aliases: [...kasus.aliases], status: kasus.status,
      startedAt: kasus.startedAt.toISOString(),
      closedAt: kasus.closedAt?.toISOString() ?? null,
      jurisdiction: kasus.jurisdiction, caseType: kasus.caseType,
      summary: kasus.summary.value,
    },
  }).onConflictDoNothing();
}

type Certainty = 'established' | 'alleged' | 'reported' | 'disputed' | 'unverified';
type EventType = 'hearing' | 'indictment' | 'verdict' | 'asset_seizure' | 'public_statement' | 'other';
type RelType = 'employed_by' | 'allegedly_paid' | 'testified_for' | 'prosecuted_by' | 'ruled_on' | 'owned_by' | 'other';

async function seedEvent(args: {
  id: string; uid: string; caseId: string; type: EventType;
  date: Date; title: string; summary: string; certainty: Certainty;
  sourceIds: string[]; entityIds: string[]; now?: Date;
}): Promise<void> {
  const { id, uid, caseId, type, date, title, summary, certainty, sourceIds, entityIds, now = NOW } = args;
  await db.insert(events).values({
    id, ownerUserId: uid, caseId, type, date, title, summary, certainty,
    sourceIds, entityIds, currentRevisionNo: 1, updatedAt: now,
  }).onConflictDoUpdate({
    target: events.id,
    set: { title, summary, updatedAt: now },
  });
  await db.insert(eventsRevisions).values({
    aggregateId: id, revisionNo: 1, validFrom: now, validTo: null,
    actorUserId: uid, changeKind: 'created',
    payload: { type, date: date.toISOString(), title, summary, certainty, sourceIds, entityIds },
  }).onConflictDoNothing();
}

async function seedClaim(args: {
  id: string; uid: string; caseId: string; text: string;
  certainty: Certainty; sourceIds: string[];
  contradictedByClaimIds: string[]; now?: Date;
}): Promise<void> {
  const { id, uid, caseId, text, certainty, sourceIds, contradictedByClaimIds, now = NOW } = args;
  await db.insert(claims).values({
    id, ownerUserId: uid, caseId, textValue: text, certainty,
    sourceIds, contradictedByClaimIds, currentRevisionNo: 1, updatedAt: now,
  }).onConflictDoUpdate({
    target: claims.id,
    set: { textValue: text, updatedAt: now },
  });
  await db.insert(claimsRevisions).values({
    aggregateId: id, revisionNo: 1, validFrom: now, validTo: null,
    actorUserId: uid, changeKind: 'created',
    payload: { text, certainty, sourceIds, contradictedByClaimIds },
  }).onConflictDoNothing();
}

async function seedRelationship(args: {
  id: string; uid: string; fromEntityId: string; toEntityId: string;
  type: RelType; certainty: Certainty; sourceIds: string[];
  activeFrom: Date; activeTo: Date | null; description: string; now?: Date;
}): Promise<void> {
  const { id, uid, fromEntityId, toEntityId, type, certainty, sourceIds, activeFrom, activeTo, description, now = NOW } = args;
  await db.insert(relationships).values({
    id, ownerUserId: uid, fromEntityId, toEntityId, type, certainty,
    sourceIds, activeFrom, activeTo, description,
    currentRevisionNo: 1, updatedAt: now,
  }).onConflictDoUpdate({
    target: relationships.id,
    set: { description, updatedAt: now },
  });
  await db.insert(relationshipsRevisions).values({
    aggregateId: id, revisionNo: 1, validFrom: now, validTo: null,
    actorUserId: uid, changeKind: 'created',
    payload: {
      fromEntityId, toEntityId, type, certainty, sourceIds,
      activeFrom: activeFrom.toISOString(), activeTo: activeTo?.toISOString() ?? null, description,
    },
  }).onConflictDoNothing();
}

// ---------- main ----------

async function main(): Promise<void> {
  const user = await userRepo.findByEmail(emailArg);
  if (!user) {
    console.error(`User not found: ${emailArg}`);
    process.exit(1);
  }
  const uid = user.id;
  console.log(`Seeding as user: ${user.displayName} (${user.email})`);

  // ---- 3. Sources ----

  const srcSipp = Source.create({
    id: 'seed_src_sipp', ownerUserId: uid,
    url: 'https://sipp.mahkamahagung.go.id/perkara/5678/tipikor',
    publisher: 'SIPP Mahkamah Agung', tier: 'tier_1',
    fetchedAt: new Date('2024-01-25T08:00:00Z'),
    excerpt: Excerpt.of('Perkara Nomor 45/Pid.Sus-TPK/2024/PN Jkt.Pst telah terdaftar pada Pengadilan Tindak Pidana Korupsi Jakarta Pusat. Terdakwa: (1) Dr. Bambang Prasetyo, (2) Siti Rahayu. Dakwaan: Pasal 12 huruf a dan b jo. Pasal 18 UU No. 31 Tahun 1999 tentang Pemberantasan Tindak Pidana Korupsi.'),
    archiveUrl: null, bodyHash: 'deadbeef0001seed',
  });
  await seedSource(srcSipp);
  console.log('  ✓ seed_src_sipp');

  const srcKpk = Source.create({
    id: 'seed_src_kpk', ownerUserId: uid,
    url: 'https://www.kpk.go.id/id/berita/siaran-pers/2023/kpk-tetapkan-direktur-rsud-tambora',
    publisher: 'KPK.go.id', tier: 'tier_1',
    fetchedAt: new Date('2023-09-19T10:00:00Z'),
    excerpt: Excerpt.of('KPK menetapkan Direktur RSUD Kabupaten Tambora berinisial BP sebagai tersangka dalam perkara dugaan korupsi pengadaan alat Polymerase Chain Reaction (PCR) senilai Rp 12,8 miliar. Penetapan ini didasarkan atas bukti permulaan yang cukup setelah KPK melakukan penyelidikan sejak Maret 2023.'),
    archiveUrl: 'https://web.archive.org/web/20230919/https://www.kpk.go.id/id/berita/siaran-pers/2023/kpk-tetapkan-direktur-rsud-tambora',
    bodyHash: 'deadbeef0002seed',
  });
  await seedSource(srcKpk);
  console.log('  ✓ seed_src_kpk');

  const srcTempo = Source.create({
    id: 'seed_src_tempo', ownerUserId: uid,
    url: 'https://investigasi.tempo.co/korupsi-alat-pcr-tambora',
    publisher: 'Tempo.co', tier: 'tier_2',
    fetchedAt: new Date('2023-11-03T14:00:00Z'),
    excerpt: Excerpt.of('Investigasi Tempo menemukan bahwa harga alat PCR yang tertera dalam dokumen kontrak RSUD Kabupaten Tambora mencapai Rp 12,8 miliar untuk 12 unit, sementara harga pasar wajar pada periode yang sama berkisar Rp 3,1 miliar. Markup ini setara 313 persen di atas nilai pasar.'),
    archiveUrl: null, bodyHash: 'deadbeef0003seed',
  });
  await seedSource(srcTempo);
  console.log('  ✓ seed_src_tempo');

  const srcDetik = Source.create({
    id: 'seed_src_detik', ownerUserId: uid,
    url: 'https://news.detik.com/berita/sidang-rsud-tambora-tuntutan',
    publisher: 'Detik.com', tier: 'tier_2',
    fetchedAt: new Date('2024-07-11T16:30:00Z'),
    excerpt: Excerpt.of('Jaksa Penuntut Umum dari Kejaksaan Tinggi DKI Jakarta menuntut terdakwa Dr. Bambang Prasetyo dengan hukuman 9 tahun penjara, denda Rp 500 juta subsider 6 bulan kurungan, dan uang pengganti sebesar Rp 4,5 miliar. Sidang tuntutan digelar Kamis (11/7) di Pengadilan Tipikor Jakarta Pusat.'),
    archiveUrl: null, bodyHash: 'deadbeef0004seed',
  });
  await seedSource(srcDetik);
  console.log('  ✓ seed_src_detik');

  const srcIcw = Source.create({
    id: 'seed_src_icw', ownerUserId: uid,
    url: 'https://antikorupsi.org/laporan/pola-korupsi-pengadaan-kesehatan-2023',
    publisher: 'Indonesia Corruption Watch', tier: 'tier_2',
    fetchedAt: new Date('2023-12-15T09:00:00Z'),
    excerpt: Excerpt.of('Laporan ICW mengidentifikasi penggunaan perusahaan nominee sebagai modus utama korupsi pengadaan alat kesehatan. Dalam kasus RSUD Tambora, PT Medika Sejahtera Utama diduga dimiliki secara de facto oleh pejabat pembuat komitmen melalui saudara ipar sebagai pemegang saham tercatat.'),
    archiveUrl: null, bodyHash: 'deadbeef0005seed',
  });
  await seedSource(srcIcw);
  console.log('  ✓ seed_src_icw');

  // ---- 4. Entities ----

  const entBambang = Entity.create({
    id: 'seed_ent_bambang', ownerUserId: uid, type: 'person',
    canonicalName: 'Dr. Bambang Prasetyo', aliases: ['BP', 'Bambang Prasetyo'],
    description: BahasaText.of('Mantan Direktur RSUD Kabupaten Tambora yang ditetapkan sebagai tersangka utama dalam perkara korupsi pengadaan alat PCR. Dinyatakan bersalah oleh Pengadilan Tipikor Jakarta Pusat pada November 2024 dan mengajukan banding.'),
    publicFigure: true,
    profile: {
      type: 'person',
      currentPositions: [],
      priorPositions: ['Direktur RSUD Kabupaten Tambora (2020–2024)', 'Kabid Pelayanan Medis, Dinas Kesehatan Provinsi Banten (2016–2020)'],
      lhkpnUrl: 'https://elhkpn.kpk.go.id/portal/user/detail_profil/bambang-prasetyo-rsud',
      photoUrl: null,
      rightOfReply: RightOfReply.empty(),
    },
  });
  await seedEntity(entBambang);
  console.log('  ✓ seed_ent_bambang');

  const entSiti = Entity.create({
    id: 'seed_ent_siti', ownerUserId: uid, type: 'person',
    canonicalName: 'Siti Rahayu', aliases: ['SR'],
    description: BahasaText.of('Ketua Panitia Pengadaan Barang/Jasa RSUD Kabupaten Tambora yang didakwa bersama Bambang Prasetyo. Dalam persidangan menyatakan bertindak atas instruksi atasan langsung.'),
    publicFigure: false,
    profile: {
      type: 'person',
      currentPositions: ['Ketua Panitia Pengadaan RSUD Kabupaten Tambora'],
      priorPositions: [],
      lhkpnUrl: null, photoUrl: null,
      rightOfReply: RightOfReply.empty(),
    },
  });
  await seedEntity(entSiti);
  console.log('  ✓ seed_ent_siti');

  const entPtMedika = Entity.create({
    id: 'seed_ent_pt_medika', ownerUserId: uid, type: 'company',
    canonicalName: 'PT Medika Sejahtera Utama', aliases: ['PT MSU', 'Medika Sejahtera'],
    description: BahasaText.of('Perusahaan distributor alat kesehatan yang memenangkan tender pengadaan alat PCR RSUD Kabupaten Tambora senilai Rp 12,8 miliar. Tidak memiliki izin distributor saat kontrak ditandatangani. Aset disita KPK pada Maret 2024.'),
    publicFigure: false,
    profile: {
      type: 'company',
      beneficialOwners: ['Hartono Wibisono (kakak ipar Dr. Bambang Prasetyo, pemegang saham nominal)'],
      rightOfReply: RightOfReply.empty(),
    },
  });
  await seedEntity(entPtMedika);
  console.log('  ✓ seed_ent_pt_medika');

  const entRsud = Entity.create({
    id: 'seed_ent_rsud', ownerUserId: uid, type: 'institution',
    canonicalName: 'RSUD Kabupaten Tambora', aliases: ['Rumah Sakit Umum Daerah Tambora', 'RSUD Tambora'],
    description: BahasaText.of('Rumah sakit umum daerah milik Pemerintah Kabupaten Tambora, Provinsi Banten. Korban langsung perkara korupsi pengadaan alat PCR yang merugikan keuangan negara senilai Rp 9,7 miliar.'),
    publicFigure: true,
    profile: {
      type: 'institution',
      mandate: BahasaText.of('Menyelenggarakan pelayanan kesehatan tingkat rujukan di wilayah Kabupaten Tambora sesuai standar pelayanan minimal rumah sakit daerah.'),
      leadership: ['dr. Agus Santoso, Sp.PD (Plt Direktur, diangkat menggantikan terdakwa sejak Januari 2024)'],
      rightOfReply: RightOfReply.empty(),
    },
  });
  await seedEntity(entRsud);
  console.log('  ✓ seed_ent_rsud');

  const entKejati = Entity.create({
    id: 'seed_ent_kejati', ownerUserId: uid, type: 'institution',
    canonicalName: 'Kejaksaan Tinggi DKI Jakarta', aliases: ['Kejati DKI', 'Kejati Jakarta'],
    description: BahasaText.of('Lembaga penuntutan negara di wilayah hukum DKI Jakarta yang menangani perkara tipikor RSUD Tambora setelah pelimpahan berkas dari KPK.'),
    publicFigure: true,
    profile: {
      type: 'institution',
      mandate: BahasaText.of('Melaksanakan kekuasaan negara di bidang penuntutan di wilayah hukum DKI Jakarta, termasuk perkara tindak pidana korupsi yang dilimpahkan oleh KPK.'),
      leadership: ['Dr. Ridwan Halim, S.H., M.H. (Kepala Kejaksaan Tinggi DKI Jakarta)'],
      rightOfReply: RightOfReply.empty(),
    },
  });
  await seedEntity(entKejati);
  console.log('  ✓ seed_ent_kejati');

  // ---- 5. Case + lifecycle (4 revision rows) ----

  const caseId = 'seed_case_tambora';
  const caseSummary = 'Perkara tindak pidana korupsi pengadaan alat Polymerase Chain Reaction (PCR) di RSUD Kabupaten Tambora senilai Rp 12,8 miliar pada tahun 2022. Dua terdakwa — Direktur RSUD dan Ketua Panitia Pengadaan — dinyatakan bersalah oleh Pengadilan Tipikor Jakarta Pusat pada November 2024 dan mengajukan banding. KPK memperkirakan kerugian negara mencapai Rp 9,7 miliar.';

  // Main row: final state (appeal)
  await db.insert(cases).values({
    id: caseId, ownerUserId: uid,
    name: 'Kasus Korupsi Pengadaan Alat PCR — RSUD Kabupaten Tambora',
    aliases: ['Kasus RSUD Tambora', 'Perkara No. 45/Pid.Sus-TPK/2024/PN Jkt.Pst'],
    status: 'appeal',
    startedAt: new Date('2023-09-18T00:00:00Z'),
    closedAt: null,
    jurisdiction: 'Pengadilan Tindak Pidana Korupsi Jakarta',
    caseType: 'tipikor',
    summary: caseSummary,
    currentRevisionNo: 4,
    updatedAt: new Date('2024-11-15T00:00:00Z'),
  }).onConflictDoUpdate({
    target: cases.id,
    set: { status: 'appeal', currentRevisionNo: 4, updatedAt: new Date('2024-11-15T00:00:00Z') },
  });

  // 4 revision rows
  const revBase = Case.restore({
    id: caseId, ownerUserId: uid,
    name: 'Kasus Korupsi Pengadaan Alat PCR — RSUD Kabupaten Tambora',
    aliases: ['Kasus RSUD Tambora', 'Perkara No. 45/Pid.Sus-TPK/2024/PN Jkt.Pst'],
    startedAt: new Date('2023-09-18T00:00:00Z'), closedAt: null,
    jurisdiction: 'Pengadilan Tindak Pidana Korupsi Jakarta', caseType: 'tipikor',
    summary: BahasaText.of(caseSummary), status: 'open',
  });
  await seedCaseRevision(revBase, 1, new Date('2023-09-18T00:00:00Z'), new Date('2024-01-22T00:00:00Z'), uid);
  await seedCaseRevision(Case.restore({ ...revBase.toProps(), status: 'trial' }), 2, new Date('2024-01-22T00:00:00Z'), new Date('2024-11-08T00:00:00Z'), uid);
  await seedCaseRevision(Case.restore({ ...revBase.toProps(), status: 'verdict' }), 3, new Date('2024-11-08T00:00:00Z'), new Date('2024-11-15T00:00:00Z'), uid);
  await seedCaseRevision(Case.restore({ ...revBase.toProps(), status: 'appeal' }), 4, new Date('2024-11-15T00:00:00Z'), null, uid);
  console.log('  ✓ seed_case_tambora (appeal, 4 revisions)');

  // ---- 6. Events ----

  await seedEvent({ id: 'seed_evt_pers_kpk', uid, caseId, type: 'public_statement',
    date: new Date('2023-09-18T00:00:00Z'),
    title: 'KPK tetapkan Direktur RSUD Tambora sebagai tersangka korupsi pengadaan alat PCR',
    summary: 'Komisi Pemberantasan Korupsi menetapkan Direktur RSUD Kabupaten Tambora berinisial BP sebagai tersangka dalam perkara dugaan korupsi pengadaan alat PCR. KPK menyatakan telah mengantongi bukti permulaan yang cukup setelah penyelidikan berlangsung sejak Maret 2023.',
    certainty: 'established', sourceIds: [srcKpk.id], entityIds: [entBambang.id] });
  console.log('  ✓ seed_evt_pers_kpk');

  await seedEvent({ id: 'seed_evt_penahanan', uid, caseId, type: 'other',
    date: new Date('2023-10-05T00:00:00Z'),
    title: 'Bambang Prasetyo dan Siti Rahayu ditahan di Rutan KPK Guntur',
    summary: 'KPK menahan dua tersangka perkara korupsi RSUD Tambora: Dr. Bambang Prasetyo di Rutan KPK Guntur dan Siti Rahayu di Rutan KPK Pomdam Jaya Guntur. Penahanan dilakukan selama 20 hari pertama terhitung sejak 5 Oktober 2023.',
    certainty: 'established', sourceIds: [srcDetik.id], entityIds: [entBambang.id, entSiti.id] });
  console.log('  ✓ seed_evt_penahanan');

  await seedEvent({ id: 'seed_evt_dakwaan', uid, caseId, type: 'indictment',
    date: new Date('2024-01-22T00:00:00Z'),
    title: 'Dakwaan resmi dibacakan di PN Tipikor Jakarta Pusat',
    summary: 'Jaksa Penuntut Umum Kejaksaan Tinggi DKI Jakarta membacakan surat dakwaan terhadap Dr. Bambang Prasetyo dan Siti Rahayu di Pengadilan Tindak Pidana Korupsi Jakarta Pusat. Dakwaan primair: Pasal 12 huruf a UU Tipikor dengan ancaman penjara seumur hidup.',
    certainty: 'established', sourceIds: [srcSipp.id, srcDetik.id], entityIds: [entBambang.id, entSiti.id, entKejati.id] });
  console.log('  ✓ seed_evt_dakwaan');

  await seedEvent({ id: 'seed_evt_sidang1', uid, caseId, type: 'hearing',
    date: new Date('2024-02-14T00:00:00Z'),
    title: 'Sidang perdana: pembacaan dakwaan dan tanggapan terdakwa',
    summary: 'Sidang perdana digelar di Pengadilan Tipikor Jakarta Pusat. Kuasa hukum terdakwa mengajukan eksepsi atas dakwaan dan memohon penangguhan penahanan yang ditolak majelis hakim.',
    certainty: 'established', sourceIds: [srcSipp.id], entityIds: [entBambang.id, entSiti.id] });
  console.log('  ✓ seed_evt_sidang1');

  await seedEvent({ id: 'seed_evt_sitaan', uid, caseId, type: 'asset_seizure',
    date: new Date('2024-03-28T00:00:00Z'),
    title: 'KPK sita aset PT Medika Sejahtera Utama: gudang, 3 kendaraan, dan rekening senilai Rp 6,2 miliar',
    summary: 'KPK menyita aset milik PT Medika Sejahtera Utama sebagai barang bukti, meliputi: satu unit gudang di Tangerang, tiga kendaraan roda empat, dan saldo rekening bank senilai total Rp 6,2 miliar.',
    certainty: 'established', sourceIds: [srcKpk.id, srcDetik.id], entityIds: [entPtMedika.id, entBambang.id] });
  console.log('  ✓ seed_evt_sitaan');

  await seedEvent({ id: 'seed_evt_tuntutan', uid, caseId, type: 'hearing',
    date: new Date('2024-07-11T00:00:00Z'),
    title: 'Sidang tuntutan: JPU Kejati DKI tuntut Bambang 9 tahun penjara dan denda Rp 500 juta',
    summary: 'JPU Kejaksaan Tinggi DKI Jakarta menuntut Dr. Bambang Prasetyo dengan pidana penjara 9 tahun, denda Rp 500 juta subsider 6 bulan kurungan, dan uang pengganti Rp 4,5 miliar. Siti Rahayu dituntut 5 tahun penjara.',
    certainty: 'reported', sourceIds: [srcTempo.id, srcDetik.id], entityIds: [entBambang.id, entKejati.id] });
  console.log('  ✓ seed_evt_tuntutan');

  await seedEvent({ id: 'seed_evt_vonis', uid, caseId, type: 'verdict',
    date: new Date('2024-11-08T00:00:00Z'),
    title: 'Hakim nyatakan bersalah: vonis 7 tahun penjara dan uang pengganti Rp 4,5 miliar — terdakwa ajukan banding',
    summary: 'Majelis hakim Pengadilan Tipikor Jakarta Pusat menjatuhkan vonis bersalah kepada Dr. Bambang Prasetyo dengan pidana penjara 7 tahun, denda Rp 300 juta, dan uang pengganti Rp 4,5 miliar. Siti Rahayu divonis 3 tahun 6 bulan. Keduanya menyatakan banding pada hari yang sama.',
    certainty: 'established', sourceIds: [srcSipp.id], entityIds: [entBambang.id, entSiti.id] });
  console.log('  ✓ seed_evt_vonis');

  // ---- 7. Claims ----

  await seedClaim('seed_clm_suap', uid, caseId,
    'Dr. Bambang Prasetyo diduga menerima gratifikasi senilai Rp 4,5 miliar dari PT Medika Sejahtera Utama sebagai imbalan penetapan pemenang tender pengadaan alat PCR RSUD Kabupaten Tambora tahun 2022.',
    'alleged', [srcKpk.id, srcTempo.id], []);
  console.log('  ✓ seed_clm_suap');

  await seedClaim('seed_clm_markup', uid, caseId,
    'Harga pengadaan alat PCR dicatatkan Rp 12,8 miliar dalam dokumen kontrak, sedangkan harga pasar wajar pada periode yang sama adalah Rp 3,1 miliar — setara markup 313 persen di atas nilai pasar.',
    'established', [srcTempo.id, srcIcw.id], []);
  console.log('  ✓ seed_clm_markup');

  await seedClaim('seed_clm_izin', uid, caseId,
    'PT Medika Sejahtera Utama tidak memiliki izin distributor alat kesehatan yang valid dari Kementerian Kesehatan pada saat kontrak pengadaan ditandatangani pada Juni 2022.',
    'established', [srcKpk.id], []);
  console.log('  ✓ seed_clm_izin');

  await seedClaim('seed_clm_siti_alibi', uid, caseId,
    'Siti Rahayu dalam keterangan persidangan menyatakan bahwa seluruh keputusan teknis pengadaan dibuat atas instruksi langsung Dr. Bambang Prasetyo dan ia tidak memiliki kewenangan untuk menolak perintah atasan.',
    'alleged', [srcDetik.id], ['seed_clm_suap']);
  console.log('  ✓ seed_clm_siti_alibi');

  await seedClaim('seed_clm_rekening', uid, caseId,
    'Berdasarkan laporan analisis keuangan ICW, aliran dana kickback mengalir ke rekening atas nama Ny. Dewi Lestari (istri terdakwa Bambang Prasetyo) melalui dua perusahaan cangkang yang terafiliasi dengan Hartono Wibisono.',
    'reported', [srcIcw.id], []);
  console.log('  ✓ seed_clm_rekening');

  // ---- 8. Relationships ----

  await seedRelationship('seed_rel_bambang_rsud', uid, entBambang.id, entRsud.id, 'employed_by', 'established',
    [srcSipp.id], new Date('2020-01-15T00:00:00Z'), new Date('2024-01-15T00:00:00Z'),
    'Bambang menjabat sebagai Direktur RSUD Kabupaten Tambora berdasarkan SK Bupati No. 821/2020, dicopot setelah ditetapkan sebagai tersangka KPK.');
  console.log('  ✓ seed_rel_bambang_rsud');

  await seedRelationship('seed_rel_siti_rsud', uid, entSiti.id, entRsud.id, 'employed_by', 'established',
    [srcSipp.id], new Date('2021-03-01T00:00:00Z'), null,
    'Siti Rahayu menjabat sebagai Ketua Panitia Pengadaan Barang/Jasa RSUD Kabupaten Tambora sejak Maret 2021.');
  console.log('  ✓ seed_rel_siti_rsud');

  await seedRelationship('seed_rel_bambang_ptmedika', uid, entBambang.id, entPtMedika.id, 'allegedly_paid', 'alleged',
    [srcKpk.id, srcTempo.id], new Date('2022-06-01T00:00:00Z'), new Date('2023-07-31T00:00:00Z'),
    'Diduga menerima gratifikasi dari PT Medika Sejahtera Utama melalui transfer ke rekening nominee atas nama anggota keluarga terdakwa.');
  console.log('  ✓ seed_rel_bambang_ptmedika');

  await seedRelationship('seed_rel_ptmedika_bambang', uid, entPtMedika.id, entBambang.id, 'owned_by', 'alleged',
    [srcIcw.id], new Date('2019-08-01T00:00:00Z'), null,
    'PT Medika Sejahtera Utama diduga dimiliki secara de facto oleh Dr. Bambang melalui Hartono Wibisono sebagai nominee pemegang saham tercatat.');
  console.log('  ✓ seed_rel_ptmedika_bambang');

  await seedRelationship('seed_rel_bambang_kejati', uid, entBambang.id, entKejati.id, 'prosecuted_by', 'established',
    [srcSipp.id], new Date('2024-01-22T00:00:00Z'), null,
    'Dituntut oleh Jaksa Penuntut Umum Kejaksaan Tinggi DKI Jakarta dalam perkara tipikor RSUD Tambora dengan tuntutan 9 tahun penjara.');
  console.log('  ✓ seed_rel_bambang_kejati');

  await seedRelationship('seed_rel_siti_kejati', uid, entSiti.id, entKejati.id, 'prosecuted_by', 'established',
    [srcSipp.id], new Date('2024-01-22T00:00:00Z'), null,
    'Dituntut bersama Dr. Bambang Prasetyo dalam berkas perkara yang sama, dengan tuntutan 5 tahun penjara.');
  console.log('  ✓ seed_rel_siti_kejati');

  console.log('\nSeed complete.');
  console.log(`  Case ID: ${caseId}`);
  console.log(`  Navigate to: /cases/${caseId}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => close());
