# Signing & rilis APK

Kredensial signing **tidak disimpan di repo** (repo ini publik).

## Di mana keystore-nya

```
~/.keys/arplication/arplication-release.keystore   (chmod 600, di luar repo)
```

Cadangkan file itu. Kalau hilang, update APK tidak bisa menimpa versi terpasang —
pengguna harus uninstall dulu.

## Cara build lokal

Buat `android/local.properties` (sudah gitignored):

```properties
sdk.dir=/home/<user>/Android/Sdk
arplication.storeFile=/home/<user>/.keys/arplication/arplication-release.keystore
arplication.storePassword=<password>
arplication.keyAlias=arplication
arplication.keyPassword=<password>
```

Alternatif tanpa file — lewat environment variable:

```bash
export ARPLICATION_STORE_FILE=/path/keystore
export ARPLICATION_STORE_PASSWORD=...
export ARPLICATION_KEY_ALIAS=arplication
export ARPLICATION_KEY_PASSWORD=...
```

Tanpa keduanya, `assembleRelease` tetap berhasil tetapi menghasilkan APK
**tanpa tanda tangan** (dan log memberi peringatan).

## Rilis

```bash
source ~/.local/bin/android-env   # JDK 21
scripts/release.sh patch --notes <file.md> -y
```

Skrip menaikkan `versionCode`/`versionName`, build web + `cap sync`, build APK,
commit, tag, push ke kedua remote, lalu membuat GitHub Release + upload APK.

## Verifikasi setelah build

```bash
~/Android/Sdk/build-tools/36.0.0/apksigner verify --print-certs \
  android/app/build/outputs/apk/release/app-release.apk
```

Sertifikat harus tetap `CN=Aruthtale` — kalau berubah, update tidak akan bisa
menimpa instalasi lama.
