# Tutorial Grafana Loki untuk Notes App

## Apa itu Grafana Loki?

**Grafana Loki** adalah sistem log aggregation yang dirancang untuk menyimpan dan query log aplikasi dengan efisien.

### Konsep Dasar

#### 1. **Loki (Database)**
- Menyimpan log dari aplikasi
- Tidak melakukan full-text indexing (hanya index metadata/label)
- Lebih hemat storage dibanding Elasticsearch
- Retention policy: 7 hari (dapat dikonfigurasi)

#### 2. **Promtail (Log Collector)**
- Agent yang mengumpulkan logs dari berbagai sumber
- Membaca file log dan stdout/stderr container
- Mengirim logs ke Loki dengan label yang sesuai
- Dapat melakukan parsing dan transformasi log

#### 3. **Grafana (Visualization)**
- Dashboard untuk visualisasi logs
- Query logs dengan LogQL (query language mirip PromQL)
- Membuat alert berdasarkan log patterns
- Integrasi sempurna dengan Loki

### Arsitektur

```
┌─────────────┐
│  Notes App  │
│  (Node.js)  │
└──────┬──────┘
       │ generate logs
       ▼
┌─────────────┐
│   Winston   │ (JSON logs)
│   Logger    │
└──────┬──────┘
       │ write to files
       ▼
┌─────────────┐
│  Promtail   │ (collect logs)
└──────┬──────┘
       │ push logs
       ▼
┌─────────────┐
│    Loki     │ (store logs)
└──────┬──────┘
       │ query logs
       ▼
┌─────────────┐
│   Grafana   │ (visualize)
└─────────────┘
```

## Fitur Utama - View Logs Button

Project ini dilengkapi dengan **integrasi UI ke Grafana** yang memudahkan monitoring logs:

### Button "View Logs" di UI
- Terletak di **header aplikasi** (pojok kanan atas)
- **Klik sekali** langsung membuka Grafana Explore
- Query logs **sudah pre-filled** dengan `{service="notes-app"}`
- Range waktu otomatis set ke **1 jam terakhir**
- Membuka di **tab baru** agar tidak mengganggu workflow

### Implementasi Teknis
```javascript
// Endpoint /logs di server.js
app.get("/logs", (req, res) => {
  const grafanaUrl = process.env.GRAFANA_URL || "http://localhost:3001";

  const exploreQuery = {
    datasource: "Loki",
    queries: [{
      expr: '{service="notes-app"}',
      queryType: "range"
    }],
    range: { from: "now-1h", to: "now" }
  };

  res.redirect(grafanaExploreUrl);
});
```

Ini sangat berguna untuk:
- **Debugging** saat development
- **Monitoring** aplikasi real-time
- **Training/Praktikum** - mahasiswa bisa langsung lihat logs tanpa setup manual

## Setup dan Instalasi

### Prerequisites
- Docker dan Docker Compose terinstall
- Port 3000, 3001, 3100, 9080 tersedia

### Langkah 1: Install Dependencies

```bash
npm install
```

Dependencies yang ditambahkan:
- `winston`: Library logging untuk Node.js dengan support JSON format

### Langkah 2: Jalankan Stack dengan Docker Compose

```bash
docker-compose up -d
```

Perintah ini akan menjalankan 4 container:
1. **notes-app** (Port 3000): Aplikasi Notes
2. **loki** (Port 3100): Log aggregation system
3. **promtail** (Port 9080): Log collector
4. **grafana** (Port 3001): Dashboard visualization

### Langkah 3: Verifikasi Container Berjalan

```bash
docker-compose ps
```

Semua container harus dalam status "Up" atau "healthy".

### Langkah 4: Cek Logs

```bash
# Logs aplikasi
docker-compose logs -f notes-app

# Logs Loki
docker-compose logs -f loki

# Logs Promtail
docker-compose logs -f promtail
```

## Menggunakan Grafana

### 1. Akses Grafana - MUDAH! 🚀

**Cara Termudah (Recommended untuk Praktikum):**

1. Buka aplikasi Notes: `http://localhost:3000`
2. Klik button **"📊 View Logs"** di pojok kanan atas header
3. Browser akan otomatis membuka **Grafana Explore** dengan query logs yang sudah terisi
4. Anda langsung bisa melihat semua logs dari aplikasi Notes!

**Atau Akses Manual:**

Buka browser dan akses:
```
http://localhost:3001
```

**Login Credentials:**
- Username: `admin`
- Password: `admin`

### 2. Verifikasi Data Source

1. Klik **Configuration (⚙️)** → **Data Sources**
2. Pastikan **Loki** sudah terdaftar dan berwarna hijau (connected)
3. URL Loki: `http://loki:3100`

### 3. Explore Logs

#### Cara 1: Menggunakan Explore

1. Klik **Explore (🧭)** di sidebar
2. Pilih **Loki** sebagai data source
3. Gunakan query berikut:

**Query Dasar:**
```logql
{service="notes-app"}
```

**Filter by Log Level:**
```logql
{service="notes-app", level="error"}
```

**Search untuk kata tertentu:**
```logql
{service="notes-app"} |= "created"
```

**Filter HTTP requests:**
```logql
{service="notes-app"} |= "HTTP Request"
```

**Hitung log per level:**
```logql
sum(count_over_time({service="notes-app"}[5m])) by (level)
```

#### Cara 2: Import Dashboard

1. Klik **Dashboards (+)** → **Import**
2. Upload file `grafana-dashboard.json`
3. Pilih **Loki** sebagai data source
4. Klik **Import**

Dashboard akan menampilkan:
- **Log Volume Over Time**: Grafik jumlah log per waktu
- **Recent Logs**: Log terbaru secara real-time
- **Logs by Level**: Pie chart distribusi log level
- **Error Logs**: Khusus menampilkan error logs

## LogQL Queries untuk Praktikum

### Query Dasar

```logql
# Semua logs dari notes-app
{service="notes-app"}

# Filter by environment
{service="notes-app", environment="production"}

# Filter by log level
{service="notes-app", level="info"}
{service="notes-app", level="error"}
{service="notes-app", level="warn"}
```

### Filter Logs

```logql
# Logs yang mengandung kata "created"
{service="notes-app"} |= "created"

# Logs yang TIDAK mengandung kata "health"
{service="notes-app"} != "health"

# Logs dengan regex pattern
{service="notes-app"} |~ "note.*created"

# Kombinasi filter
{service="notes-app", level="error"} |= "failed"
```

### Aggregate Queries

```logql
# Total logs dalam 5 menit terakhir
sum(count_over_time({service="notes-app"}[5m]))

# Logs per level dalam 5 menit terakhir
sum(count_over_time({service="notes-app"}[5m])) by (level)

# Rate of logs per second
rate({service="notes-app"}[1m])

# Error rate
sum(rate({service="notes-app", level="error"}[5m]))
```

### Parsing JSON Logs

```logql
# Parse JSON dan extract field
{service="notes-app"} | json

# Filter berdasarkan JSON field
{service="notes-app"} | json | method="POST"

# Filter berdasarkan status code
{service="notes-app"} | json | status >= 400
```

## Testing Log Generation

### 1. Generate Normal Logs

Buka aplikasi dan lakukan operasi CRUD:

```bash
# Create note
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Note","content":"This is a test"}'

# Get all notes
curl http://localhost:3000/api/notes

# Delete note
curl -X DELETE http://localhost:3000/api/notes/1
```

### 2. Generate Error Logs

```bash
# Missing fields (400 error)
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'

# Not found (404 error)
curl -X DELETE http://localhost:3000/api/notes/999
```

### 3. Monitor di Grafana

1. Buka Grafana Explore
2. Gunakan query: `{service="notes-app"}`
3. Klik **Live** untuk melihat logs real-time
4. Lakukan operasi di aplikasi
5. Lihat logs muncul secara real-time

## Penjelasan Konfigurasi

### Winston Logger (logger.js)

```javascript
// Format JSON untuk Loki
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Metadata default untuk setiap log
defaultMeta: {
  service: 'notes-app',
  environment: process.env.NODE_ENV
}
```

**Kenapa JSON Format?**
- Mudah di-parse oleh Promtail
- Terstruktur dengan field yang jelas
- Mendukung metadata dan labels
- Lebih mudah untuk filtering dan searching

### Promtail Config (promtail-config.yml)

```yaml
scrape_configs:
  - job_name: notes-app
    static_configs:
      - targets:
          - localhost
        labels:
          job: notes-app
          __path__: /var/log/app/*.log
```

**Fungsi:**
- Membaca file log dari `/var/log/app/`
- Menambahkan label `job=notes-app`
- Parsing JSON untuk extract fields
- Mengirim ke Loki dengan label yang sesuai

### Loki Config (loki-config.yml)

```yaml
limits_config:
  retention_period: 168h  # 7 hari

compactor:
  retention_enabled: true
  retention_delete_delay: 2h
```

**Fungsi:**
- Retention: Menyimpan log selama 7 hari
- Compaction: Mengoptimalkan storage
- Limits: Mencegah overload

## Troubleshooting

### Logs tidak muncul di Grafana

1. **Cek Promtail logs:**
```bash
docker-compose logs promtail
```

2. **Cek Loki API:**
```bash
curl http://localhost:3100/ready
curl http://localhost:3100/metrics
```

3. **Cek file logs di container:**
```bash
docker-compose exec notes-app ls -la /var/log/app/
docker-compose exec notes-app cat /var/log/app/combined.log
```

### Promtail tidak bisa baca logs

**Solusi:** Pastikan volume sudah di-mount dengan benar:
```yaml
volumes:
  - app-logs:/var/log/app
```

### Grafana tidak bisa connect ke Loki

**Solusi:** Pastikan semua container dalam satu network:
```yaml
networks:
  - loki-network
```

## Best Practices

### 1. Structured Logging

Gunakan JSON format dengan field yang konsisten:
```javascript
logger.info("User action", {
  userId: 123,
  action: "create_note",
  noteId: 456
});
```

### 2. Log Levels

Gunakan level yang tepat:
- `error`: Errors yang perlu perhatian
- `warn`: Warning yang tidak blocking
- `info`: Informasi operasional
- `debug`: Debugging detail (development only)

### 3. Label Selection

Gunakan label untuk high-cardinality data:
```javascript
// Good
defaultMeta: {
  service: 'notes-app',
  environment: 'production'
}

// Bad - jangan gunakan userId sebagai label
defaultMeta: {
  userId: req.user.id  // ❌ High cardinality
}
```

### 4. Log Retention

Sesuaikan retention berdasarkan kebutuhan:
```yaml
limits_config:
  retention_period: 168h  # 7 hari untuk production
```

## Pertanyaan Praktikum

### 1. Apa perbedaan Loki dengan Elasticsearch?

**Loki:**
- Index hanya metadata (labels)
- Lebih murah dan lightweight
- Query dengan LogQL
- Cocok untuk container logs

**Elasticsearch:**
- Full-text indexing
- Lebih powerful untuk searching
- Query dengan DSL
- Lebih berat dan mahal

### 2. Bagaimana Promtail mengumpulkan logs?

Promtail bekerja dengan:
1. Membaca file logs dari path yang dikonfigurasi
2. Membaca stdout/stderr dari Docker containers
3. Parsing logs (JSON, regex, dll)
4. Menambahkan labels
5. Push ke Loki via HTTP API

### 3. Apa itu Labels di Loki?

Labels adalah metadata key-value yang digunakan untuk:
- Indexing logs
- Filtering logs
- Grouping logs

Contoh: `{service="notes-app", level="error", environment="production"}`

### 4. Kenapa menggunakan JSON format untuk logs?

- Mudah di-parse otomatis
- Terstruktur dengan field yang jelas
- Mendukung nested objects
- Standard di industry untuk structured logging

## Referensi

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Promtail Configuration](https://grafana.com/docs/loki/latest/clients/promtail/configuration/)
- [Winston Logger](https://github.com/winstonjs/winston)

## Kesimpulan

Grafana Loki adalah solusi monitoring logs yang:
- Lightweight dan cost-effective
- Mudah di-setup dengan Docker
- Terintegrasi sempurna dengan Grafana
- Cocok untuk microservices dan container environments

Dengan implementasi ini, Anda dapat:
- Monitor aplikasi secara real-time
- Debug issues dengan mudah
- Analyze patterns dari logs
- Setup alerts berdasarkan log patterns
