# StudyTrack STIKOM Tunas Bangsa

Aplikasi akademik mahasiswa untuk STIKOM Tunas Bangsa Pematangsiantar.

## Pola project
Project ini dibuat dengan pola yang sama seperti Reborn Futsal Academy:
- HTML/CSS/JavaScript ringan
- Supabase untuk Auth + PostgreSQL
- GitHub sebagai source code
- Cloudflare Pages untuk deployment
- `supabase_schema.sql` sebagai database awal

## Fitur
- Login / register Supabase
- Dashboard mahasiswa
- Profil TI / SI dan semester 1-8
- Jadwal kuliah
- Tugas dan deadline
- Nilai dan IPK otomatis
- Target IPK 4.00
- Target Cumlaude yang dapat diubah
- Motivasi, alasan pribadi, dan streak belajar
- Pengaturan skala nilai
- Admin/management sederhana
- Responsive desktop + mobile

## Setup
1. Upload seluruh isi folder ke repository GitHub.
2. Buat project Supabase.
3. Jalankan `supabase_schema.sql` di Supabase SQL Editor.
4. Buka `supabase.js`, isi `SUPABASE_URL` dan `SUPABASE_ANON_KEY`.
5. Untuk Cloudflare Pages, gunakan root project ini sebagai directory yang di-deploy. Karena project static, build command dapat dikosongkan.
6. Setelah domain aktif, tambahkan URL domain tersebut ke Supabase Authentication > URL Configuration.

> Jangan pernah memasukkan `service_role` key ke frontend. Gunakan hanya Supabase anon/publishable key.
