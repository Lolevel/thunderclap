# Alte SQL Migrations (Archiv)

Diese Dateien sind alte manuelle SQL-Migrations, die vor der Einführung von Flask-Migrate/Alembic verwendet wurden.

**Status**: Archiviert - Nicht mehr in Verwendung

**Neues System**: Flask-Migrate (Alembic) generiert automatisch Migrations basierend auf Model-Änderungen.

## Migrations in diesem Archiv

- `001_add_missing_columns.sql` - Fügte `locked_roster` zu `teams` hinzu
- `002_add_draft_scenarios.sql` - Erstellte `draft_scenarios` Tabelle
- `add_locked_roster.sql` - Alte Version von locked_roster Migration
- `add_roster_fields.sql` - Alte Roster-Felder Migration

## Warum archiviert?

Diese Migrations wurden bereits auf der Datenbank ausgeführt. Das neue Flask-Migrate System:

1. **Erkennt automatisch** Schema-Änderungen durch Vergleich von Models mit DB
2. **Generiert automatisch** Migration-Scripts
3. **Führt automatisch** beim Container-Start aus
4. **Versioniert** alle Änderungen in `backend/migrations/versions/`

## Neue Migrations erstellen

```bash
# Automatisch beim Container-Start
docker-compose up -d

# Oder manuell
flask db migrate -m "Beschreibung der Änderung"
flask db upgrade
```

Siehe [../auto_migrate.py](../auto_migrate.py) für Details.
