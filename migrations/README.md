# Database Migrations

This directory contains SQL migration scripts for the Thunderclap database.

## Running Migrations on Production

To apply a migration to the production database:

```bash
# From the project root
docker exec -i pl_scout_postgres psql -U pl_scout_user -d pl_scout < migrations/XXX_migration_name.sql
```

## Migration History

### 007_remove_old_rank_columns.sql (2025-01-19)
**Description**: Removes deprecated rank columns from players table
- Removes: `current_rank`, `current_lp`, `peak_rank`
- These columns have been replaced by separate `soloq_*` and `flexq_*` columns

**Impact**: Non-breaking (columns are no longer used in code)

**How to apply**:
```bash
docker exec -i pl_scout_postgres psql -U pl_scout_user -d pl_scout < migrations/007_remove_old_rank_columns.sql
```

---

## Migration Best Practices

1. **Test locally first**: Always test migrations on local dev database before production
2. **Backup**: Create database backup before running migrations on production
3. **Non-breaking changes**: Prefer additive migrations (add columns) over destructive ones (drop columns)
4. **Rollback plan**: Have a rollback script ready for critical migrations
5. **Naming convention**: `XXX_descriptive_name.sql` where XXX is sequential number

## Rollback

If you need to rollback migration 007:

```sql
-- This would re-add the old columns (not recommended, just for reference)
ALTER TABLE players
    ADD COLUMN current_rank VARCHAR(20),
    ADD COLUMN current_lp INTEGER,
    ADD COLUMN peak_rank VARCHAR(20);
```

**Note**: Rolling back this migration is not necessary since the old columns are deprecated and no longer used.
