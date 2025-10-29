# Database Migrations

Dieses Verzeichnis enthält SQL-Migrationen für die Thunderclap-Datenbank.

## Wie funktioniert das Migrations-System?

Das Auto-Migrations-System (`auto_migrate.py`) wird automatisch beim Container-Start ausgeführt:

1. **Migration-Tracking**: Eine Tabelle `schema_migrations` tracked, welche Migrationen bereits ausgeführt wurden
2. **Automatische Ausführung**: Beim Start werden alle pending Migrationen automatisch ausgeführt
3. **Sortierte Reihenfolge**: Migrationen werden alphabetisch sortiert ausgeführt

## Migration erstellen

1. Erstelle eine neue `.sql` Datei in diesem Verzeichnis
2. Benenne sie nach dem Schema: `XXX_beschreibung.sql` (z.B. `008_add_user_roles.sql`)
3. Schreibe idempotentes SQL (benutze `IF NOT EXISTS`, `IF EXISTS`, etc.)

**Beispiel:**
```sql
-- Migration: 008_add_user_roles
-- Adds user_role column to players table

ALTER TABLE players ADD COLUMN IF NOT EXISTS user_role VARCHAR(20) DEFAULT 'player';

COMMENT ON COLUMN players.user_role IS 'User role: player, coach, admin';
```

## Wichtige Regeln

✅ **DO:**
- Verwende `IF NOT EXISTS` und `IF EXISTS` für idempotente Migrationen
- Nummeriere Migrationen chronologisch (001, 002, 003...)
- Teste Migrationen lokal vor dem Deployment
- Schreibe klare Kommentare

❌ **DON'T:**
- Ändere niemals bereits ausgeführte Migrationen
- Lösche keine Migration-Dateien nach dem Deployment
- Verwende keine Transaktionen in SQL (werden automatisch gehandhabt)

## Upgrade von alter zu neuer DB

Beim Upgrade von einer älteren DB-Version:

1. **Backup erstellen**: `docker exec pl_scout_postgres pg_dump -U pl_scout_user pl_scout > backup.sql`
2. **Container neustarten**: `docker-compose up -d --build backend`
3. **Logs prüfen**: `docker-compose logs backend`
4. **Verifizieren**:
   ```bash
   docker exec pl_scout_postgres psql -U pl_scout_user -d pl_scout -c "SELECT * FROM schema_migrations;"
   ```

Das System führt automatisch alle fehlenden Migrationen aus.

## Bestehende Migrationen

- `game_prep_schema.sql` - Game Preparation System (Rosters, Scenarios, Comments)
- `006_add_prime_league_url.sql` - PrimeLeague URL Spalte für Teams

## Troubleshooting

**Problem**: Migration schlägt fehl
```bash
# Manuell ausführen und Fehler prüfen
docker exec -i pl_scout_postgres psql -U pl_scout_user -d pl_scout < backend/migrations/XXX_migration.sql
```

**Problem**: Migration wird nicht erkannt
```bash
# Prüfe, ob Datei im Container sichtbar ist
docker exec pl_scout_backend ls -la /app/migrations/
```

**Problem**: Migration manuell als ausgeführt markieren
```bash
docker exec pl_scout_postgres psql -U pl_scout_user -d pl_scout -c "INSERT INTO schema_migrations (migration_name) VALUES ('XXX_migration.sql');"
```
