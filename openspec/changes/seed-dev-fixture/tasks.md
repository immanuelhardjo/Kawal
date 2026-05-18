## 1. Scaffold the script

- [x] 1.1 Create `tools/` directory at workspace root if it does not exist
- [x] 1.2 Create `tools/seed-dev.ts` with shebang, dotenv config loading (`apps/backend/.env`), and `--email` arg parsing (exit with message if missing)
- [x] 1.3 Wire `createDb()` from `@kawal/infrastructure` using `DATABASE_URL` and `DATABASE_TYPE` from the loaded env
- [x] 1.4 Instantiate all required repos: `DrizzleUserRepo`, `DrizzleCaseRepo`, `DrizzleSourceRepo`, `DrizzleEntityRepo`, `DrizzleEventRepo`, `DrizzleClaimRepo`, `DrizzleRelationshipRepo`

## 2. User lookup

- [x] 2.1 Call `userRepo.findByEmail(email)` and exit with code 1 + message `User not found: <email>` if null

## 3. Sources (must come before entities, events, claims, relationships)

- [x] 3.1 Build and save `seed_src_sipp` — tier_1, publisher "SIPP Mahkamah Agung", URL `https://sipp.mahkamahagung.go.id/perkara/5678/tipikor`, excerpt about case registration, `archiveUrl: null`
- [x] 3.2 Build and save `seed_src_kpk` — tier_1, publisher "KPK.go.id", URL `https://www.kpk.go.id/id/berita/siaran-pers/2023/kpk-tetapkan-direktur-rsud-tambora`, excerpt about suspect designation
- [x] 3.3 Build and save `seed_src_tempo` — tier_2, publisher "Tempo.co", URL `https://investigasi.tempo.co/korupsi-alat-pcr-tambora`, excerpt about 320% price markup investigation
- [x] 3.4 Build and save `seed_src_detik` — tier_2, publisher "Detik.com", URL `https://news.detik.com/berita/sidang-rsud-tambora-tuntutan`, excerpt about 9-year sentence demand
- [x] 3.5 Build and save `seed_src_icw` — tier_2, publisher "Indonesia Corruption Watch", URL `https://antikorupsi.org/laporan/pola-korupsi-pengadaan-kesehatan-2023`, excerpt about procurement corruption patterns

## 4. Entities

- [x] 4.1 Build and save `seed_ent_bambang` — type `person`, canonicalName "Dr. Bambang Prasetyo", publicFigure true, profile: currentPositions `["Direktur RSUD Kabupaten Tambora 2020–2024"]`, priorPositions `["Kabid Yanmed Dinas Kesehatan Provinsi Banten"]`, lhkpnUrl `"https://elhkpn.kpk.go.id/portal/user/detail_profil/bambang-prasetyo-rsud"`, photoUrl null, rightOfReply empty
- [x] 4.2 Build and save `seed_ent_siti` — type `person`, canonicalName "Siti Rahayu", publicFigure false, profile: currentPositions `["Ketua Panitia Pengadaan RSUD Kabupaten Tambora"]`, priorPositions `[]`, lhkpnUrl null, photoUrl null, rightOfReply empty
- [x] 4.3 Build and save `seed_ent_pt_medika` — type `company`, canonicalName "PT Medika Sejahtera Utama", publicFigure false, profile: beneficialOwners `["Hartono Wibisono (kakak ipar Dr. Bambang Prasetyo)"]`, rightOfReply empty
- [x] 4.4 Build and save `seed_ent_rsud` — type `institution`, canonicalName "RSUD Kabupaten Tambora", publicFigure true, profile: mandate "Rumah sakit umum daerah milik Pemerintah Kabupaten Tambora, Provinsi Banten", leadership `["dr. Agus Santoso (Plt Direktur, pengganti terdakwa sejak Januari 2024)"]`, rightOfReply empty
- [x] 4.5 Build and save `seed_ent_kejati` — type `institution`, canonicalName "Kejaksaan Tinggi DKI Jakarta", publicFigure true, profile: mandate "Lembaga penuntutan negara di wilayah hukum DKI Jakarta, menangani perkara tipikor skala provinsi", leadership `["Dr. Ridwan Halim, S.H., M.H. (Kajati DKI Jakarta)"]`, rightOfReply empty

## 5. Case and lifecycle

- [x] 5.1 Build `Case.create()` with id `seed_case_tambora`, name "Kasus Korupsi Pengadaan Alat PCR — RSUD Kabupaten Tambora", aliases `["Kasus RSUD Tambora", "Perkara No. 45/Pid.Sus-TPK/2024/PN Jkt.Pst"]`, jurisdiction "Pengadilan Tindak Pidana Korupsi Jakarta", caseType "tipikor", summary (multi-sentence description of the case), startedAt `2023-09-18`
- [x] 5.2 Save the case with `changeKind: 'created'`
- [x] 5.3 Call `.advance('trial')` on the case object and save with `changeKind: 'updated'`, now = `2024-01-22`
- [x] 5.4 Call `.advance('verdict')` and save with `changeKind: 'updated'`, now = `2024-11-08`
- [x] 5.5 Call `.advance('appeal')` and save with `changeKind: 'updated'`, now = `2024-11-15`

## 6. Events

- [x] 6.1 Build and save `seed_evt_pers_kpk` — type `public_statement`, date `2023-09-18`, title "KPK tetapkan Direktur RSUD Tambora sebagai tersangka korupsi pengadaan alat PCR", certainty `established`, sourceIds `[seed_src_kpk]`, entityIds `[seed_ent_bambang]`
- [x] 6.2 Build and save `seed_evt_penahanan` — type `other`, date `2023-10-05`, title "Bambang Prasetyo dan Siti Rahayu ditahan di Rutan KPK Guntur", certainty `established`, sourceIds `[seed_src_detik]`, entityIds `[seed_ent_bambang, seed_ent_siti]`
- [x] 6.3 Build and save `seed_evt_dakwaan` — type `indictment`, date `2024-01-22`, title "Dakwaan resmi dibacakan di PN Tipikor Jakarta Pusat", certainty `established`, sourceIds `[seed_src_sipp, seed_src_detik]`, entityIds `[seed_ent_bambang, seed_ent_siti, seed_ent_kejati]`
- [x] 6.4 Build and save `seed_evt_sidang1` — type `hearing`, date `2024-02-14`, title "Sidang perdana: pembacaan dakwaan dan tanggapan terdakwa", certainty `established`, sourceIds `[seed_src_sipp]`, entityIds `[seed_ent_bambang, seed_ent_siti]`
- [x] 6.5 Build and save `seed_evt_sitaan` — type `asset_seizure`, date `2024-03-28`, title "KPK sita aset PT Medika Sejahtera Utama: gudang, 3 kendaraan, dan rekening senilai Rp 6,2 miliar", certainty `established`, sourceIds `[seed_src_kpk, seed_src_detik]`, entityIds `[seed_ent_pt_medika, seed_ent_bambang]`
- [x] 6.6 Build and save `seed_evt_tuntutan` — type `hearing`, date `2024-07-11`, title "Sidang tuntutan: JPU Kejati DKI tuntut Bambang 9 tahun penjara dan denda Rp 500 juta", certainty `reported`, sourceIds `[seed_src_tempo, seed_src_detik]`, entityIds `[seed_ent_bambang, seed_ent_kejati]`
- [x] 6.7 Build and save `seed_evt_vonis` — type `verdict`, date `2024-11-08`, title "Hakim nyatakan bersalah: vonis 7 tahun penjara dan uang pengganti Rp 4,5 miliar — terdakwa ajukan banding", certainty `established`, sourceIds `[seed_src_sipp]`, entityIds `[seed_ent_bambang, seed_ent_siti]`

## 7. Claims

- [x] 7.1 Build and save `seed_clm_suap` — text "Dr. Bambang Prasetyo diduga menerima gratifikasi senilai Rp 4,5 miliar dari PT Medika Sejahtera Utama sebagai imbalan penetapan pemenang tender pengadaan alat PCR", certainty `alleged`, sourceIds `[seed_src_kpk, seed_src_tempo]`, contradictedByClaimIds `[]`
- [x] 7.2 Build and save `seed_clm_markup` — text "Harga pengadaan alat PCR dicatatkan Rp 12,8 miliar dalam dokumen kontrak, sedangkan harga pasar wajar pada periode yang sama adalah Rp 3,1 miliar — setara markup 313%", certainty `established`, sourceIds `[seed_src_tempo, seed_src_icw]`, contradictedByClaimIds `[]`
- [x] 7.3 Build and save `seed_clm_izin` — text "PT Medika Sejahtera Utama tidak memiliki izin distributor alat kesehatan yang valid dari Kemenkes pada saat kontrak pengadaan ditandatangani pada Juni 2022", certainty `established`, sourceIds `[seed_src_kpk]`, contradictedByClaimIds `[]`
- [x] 7.4 Build and save `seed_clm_siti_alibi` — text "Siti Rahayu dalam keterangan persidangan menyatakan bahwa seluruh keputusan teknis pengadaan dibuat atas instruksi langsung Dr. Bambang Prasetyo dan ia tidak memiliki kewenangan untuk menolak", certainty `alleged`, sourceIds `[seed_src_detik]`, contradictedByClaimIds `[seed_clm_suap]`
- [x] 7.5 Build and save `seed_clm_rekening` — text "Berdasarkan laporan analisis keuangan ICW, aliran dana kickback mengalir ke rekening atas nama Ny. Dewi Lestari (istri terdakwa) melalui dua perusahaan cangkang", certainty `reported`, sourceIds `[seed_src_icw]`, contradictedByClaimIds `[]`

## 8. Relationships

- [x] 8.1 Build and save `seed_rel_bambang_rsud` — fromEntityId `seed_ent_bambang`, toEntityId `seed_ent_rsud`, type `employed_by`, certainty `established`, sourceIds `[seed_src_sipp]`, activeFrom `2020-01-15`, activeTo `2024-01-15`, description "Bambang menjabat sebagai Direktur RSUD Kabupaten Tambora berdasarkan SK Bupati No. 821/2020"
- [x] 8.2 Build and save `seed_rel_siti_rsud` — fromEntityId `seed_ent_siti`, toEntityId `seed_ent_rsud`, type `employed_by`, certainty `established`, sourceIds `[seed_src_sipp]`, activeFrom `2021-03-01`, activeTo null, description "Siti menjabat sebagai Ketua Panitia Pengadaan Barang/Jasa RSUD Kabupaten Tambora"
- [x] 8.3 Build and save `seed_rel_bambang_ptmedika` — fromEntityId `seed_ent_bambang`, toEntityId `seed_ent_pt_medika`, type `allegedly_paid`, certainty `alleged`, sourceIds `[seed_src_kpk, seed_src_tempo]`, activeFrom `2022-06-01`, activeTo `2023-07-31`, description "Diduga menerima gratifikasi melalui transfer ke rekening nominee"
- [x] 8.4 Build and save `seed_rel_ptmedika_bambang` — fromEntityId `seed_ent_pt_medika`, toEntityId `seed_ent_bambang`, type `owned_by`, certainty `alleged`, sourceIds `[seed_src_icw]`, activeFrom `2019-08-01`, activeTo null, description "PT Medika Sejahtera Utama diduga dimiliki secara de facto oleh Dr. Bambang melalui Hartono Wibisono sebagai nominee pemegang saham"
- [x] 8.5 Build and save `seed_rel_bambang_kejati` — fromEntityId `seed_ent_bambang`, toEntityId `seed_ent_kejati`, type `prosecuted_by`, certainty `established`, sourceIds `[seed_src_sipp]`, activeFrom `2024-01-22`, activeTo null, description "Dituntut oleh JPU Kejaksaan Tinggi DKI Jakarta dalam perkara tipikor RSUD Tambora"
- [x] 8.6 Build and save `seed_rel_siti_kejati` — fromEntityId `seed_ent_siti`, toEntityId `seed_ent_kejati`, type `prosecuted_by`, certainty `established`, sourceIds `[seed_src_sipp]`, activeFrom `2024-01-22`, activeTo null, description "Dituntut bersama Dr. Bambang dalam berkas perkara yang sama"

## 9. Wire workspace script and verify

- [x] 9.1 Add `"seed:dev": "dotenv -e apps/backend/.env -- tsx tools/seed-dev.ts"` to root `package.json` scripts (or use inline dotenv loading already in the script — prefer inline; skip this if the script loads dotenv itself)
- [ ] 9.2 Run `pnpm seed:dev --email <your-dev-email>` and confirm exit code 0
- [ ] 9.3 Start the dev server and navigate to the case detail page; confirm Garis Waktu shows 7 events, Peta Kasus shows 5 nodes and 6 edges, and Dosier shows all 5 entities
