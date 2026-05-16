/**
 * Bundle of all user-facing display strings. The ONLY locale shipped is
 * Bahasa Indonesia (id-ID). Adding a new screen means adding keys here, not
 * editing component JSX.
 *
 * Per presentation-principles, editorial-tone words ("mengejutkan",
 * "sudah diduga", etc.) are forbidden — the custom ESLint rule
 * `kawal/no-editorial-tone` enforces this on this file.
 */
export const id = {
  app: {
    name: 'Kawal',
    tagline: 'Bengkel OSINT pribadi untuk kasus kepentingan publik.',
  },
  certainty: {
    established: 'Terverifikasi',
    alleged: 'Dugaan',
    reported: 'Dilaporkan',
    disputed: 'Disengketakan',
    unverified: 'Belum terverifikasi',
  },
  lifecycle: {
    open: 'Terbuka',
    trial: 'Persidangan',
    verdict: 'Putusan',
    appeal: 'Banding',
    inkracht: 'Inkracht',
    closed: 'Tutup',
  },
  signin: {
    title: 'Masuk ke Kawal',
    description:
      'Kawal adalah berkas pribadi Anda. Setiap data yang Anda kumpulkan hanya terlihat oleh Anda.',
    googleButton: 'Masuk dengan Google',
  },
  account: {
    title: 'Akun',
    email: 'Email',
    displayName: 'Nama',
    signOut: 'Keluar',
    export: 'Unduh dossier saya (JSON)',
    delete: 'Hapus akun dan seluruh dossier',
    deleteConfirm:
      'Tindakan ini menghapus seluruh dossier Anda secara permanen. Lanjutkan?',
  },
  beranda: {
    title: 'Beranda',
    briefingHeading: 'Briefing hari ini',
    briefingEmpty: 'Belum ada perubahan baru pada kasus yang Anda ikuti.',
    whatChangedHeading: 'Apa yang berubah',
    whatChangedEmpty: 'Belum ada perubahan baru.',
    quickCheckHeading: 'Cek klaim',
    quickCheckPlaceholder: 'Tempel klaim yang ingin diperiksa…',
    quickCheckSubmit: 'Periksa',
    libraryHeading: 'Kasus yang saya ikuti',
    libraryEmpty: 'Belum ada kasus yang diikuti. Buat kasus baru untuk mulai.',
    newCase: 'Kasus baru',
  },
  rightOfReply: {
    empty: 'Belum ada tanggapan publik tercatat per',
  },
  errors: {
    unknown: 'Terjadi kesalahan tak terduga.',
    network: 'Koneksi terputus. Coba lagi.',
  },
  common: {
    cancel: 'Batal',
    confirm: 'Ya, lanjutkan',
    loading: 'Memuat…',
  },
} as const;

export type Strings = typeof id;
