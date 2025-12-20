# Firebase Kurulum ve Ortam Değişkenleri

## 1. Gerekli Ortam Değişkeni
`FIREBASE_SERVICE_ACCOUNT_KEY`

- Ham JSON (lokal)
- veya Base64 JSON (önerilen)

## 2. Base64’e Çevirme

### macOS / Linux
`base64 serviceaccount.json | tr -d '\n'`

### Windows (PowerShell)
`[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceaccount.json"))`

## 3. Ortamlara Göre Kullanım

### Lokal Geliştirme
`.env.local`
`FIREBASE_SERVICE_ACCOUNT_KEY=...`

`npm run dev`

### Firebase Studio Preview
- Custom env sınırlı olabilir
- Preview frontend odaklıdır
- Backend Admin SDK testleri için önerilmez

### App Hosting / Cloud Run
- Secrets / Environment Variables desteklenir
- Base64 anahtar buraya eklenmelidir

## 4. Güvenlik
- Service Account anahtarlarını repo’ya koymayın
- Kullanım sonrası key rotate edin
