# Database Migration Guide

## Problem: Bestehende DB auf Production

Wenn auf dem Server bereits eine Datenbank läuft, wird `schema.sql` **NICHT** automatisch erneut ausgeführt. Du brauchst eine Migration.

## Lösung: Migrationen ausführen

### Option 1: Migration Script (Empfohlen - keine Datenverluste)

#### Schritt 1: Migration auf Server kopieren

```bash
# Auf dem Server
cd /path/to/thunderclap
git pull origin main
```

#### Schritt 2: Migration ausführen

```bash
# Direkt in laufenden Container
docker exec -i pl_scout_postgres psql -U pl_scout_user -d pl_scout < migrations/001_add_missing_columns.sql

# ODER mit docker exec interaktiv
docker exec -it pl_scout_postgres psql -U pl_scout_user -d pl_scout
\i /docker-entrypoint-initdb.d/../migrations/001_add_missing_columns.sql
\q
```

#### Schritt 3: Verify

```bash
# Check ob Spalte existiert
docker exec pl_scout_postgres psql -U pl_scout_user -d pl_scout -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'teams' AND column_name = 'locked_roster';
"

# Should output:
# column_name | data_type
# locked_roster | jsonb
```

#### Schritt 4: Code deployen

```bash
# Jetzt ist die DB ready für den neuen Code
docker compose -f docker-compose.prod.yml up -d --build
```

---

### Option 2: DB neu erstellen (⚠️ ALLE DATEN GEHEN VERLOREN)

**NUR wenn du keine Daten behalten willst!**

```bash
# Container stoppen
docker compose -f docker-compose.prod.yml down

# Volume löschen (⚠️ DATENVERLUST!)
docker volume rm pl_scout_postgres_data

# ODER alle Volumes
docker volume ls | grep pl_scout
docker volume rm <volume-name>

# Neu starten (schema.sql wird jetzt ausgeführt)
docker compose -f docker-compose.prod.yml up -d --build
```

---

### Option 3: Automatische Migration beim Container-Start

Ich habe ein Python-Script erstellt das automatisch läuft:

**In `docker-compose.prod.yml` anpassen:**

```yaml
backend:
  # ...
  command: sh -c "python migrate.py && gunicorn ..."
```

Das Script `backend/migrate.py` führt alle SQL-Dateien in `backend/migrations/` aus.

**Aktuell ist das NICHT aktiv**, weil ich nicht weiß ob du das willst.

---

## Welche Spalten fehlen auf deiner Production DB?

### Prüfen was fehlt:

```bash
# Auf dem Server
docker exec pl_scout_postgres psql -U pl_scout_user -d pl_scout -c "
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'teams'
ORDER BY ordinal_position;
"
```

Vergleiche Output mit `schema.sql`. Fehlende Spalten müssen migriert werden.

---

## Best Practice für Zukunft:

### 1. Flask-Migrate einrichten (Alembic)

Flask-Migrate generiert Migrations automatisch:

```bash
# Einmalig Setup
cd backend
pip install flask-migrate
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Bei Model-Änderungen
flask db migrate -m "Add locked_roster to teams"
flask db upgrade
```

### 2. Migrationen in Git committen

```
backend/
  migrations/
    versions/
      001_initial.py
      002_add_locked_roster.py
```

### 3. Beim Deploy automatisch ausführen

```yaml
backend:
  command: sh -c "flask db upgrade && gunicorn ..."
```

---

## Was ich empfehle:

### Für jetzt (Quick Fix):

```bash
# 1. Migration Script ausführen
docker exec -i pl_scout_postgres psql -U pl_scout_user -d pl_scout < migrations/001_add_missing_columns.sql

# 2. Code deployen
docker compose -f docker-compose.prod.yml up -d --build

# 3. Verify alles funktioniert
docker compose -f docker-compose.prod.yml logs -f backend
```

### Für Zukunft:

1. **Flask-Migrate einrichten** → Migrations werden automatisch generiert
2. **Migrations in Git** → Jeder Deploy führt sie aus
3. **Kein manuelles SQL mehr**

---

## Troubleshooting

### "column locked_roster already exists"

```bash
# Ignorieren - Migration ist idempotent
# Script erkennt wenn Spalte schon da ist
```

### "permission denied"

```bash
# Als postgres user ausführen
docker exec -it -u postgres pl_scout_postgres psql -U pl_scout_user -d pl_scout
```

### Migration fehlgeschlagen

```bash
# Rollback
docker exec pl_scout_postgres psql -U pl_scout_user -d pl_scout -c "
ALTER TABLE teams DROP COLUMN IF EXISTS locked_roster;
"

# Neu versuchen
docker exec -i pl_scout_postgres psql -U pl_scout_user -d pl_scout < migrations/001_add_missing_columns.sql
```

---

## Quick Commands

```bash
# Check welche Spalten Teams hat
docker exec pl_scout_postgres psql -U pl_scout_user -d pl_scout -c "\d teams"

# Check alle Tabellen
docker exec pl_scout_postgres psql -U pl_scout_user -d pl_scout -c "\dt"

# SQL direkt ausführen
docker exec pl_scout_postgres psql -U pl_scout_user -d pl_scout -c "
ALTER TABLE teams ADD COLUMN IF NOT EXISTS locked_roster JSONB;
"

# Backup vor Migration (empfohlen!)
docker exec pl_scout_postgres pg_dump -U pl_scout_user pl_scout > backup_before_migration_$(date +%Y%m%d).sql
```
