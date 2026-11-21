"""
Adds columns that exist in the SQLAlchemy models but not yet in the database.

create_all() only creates missing TABLES; on an existing PostgreSQL database (Render)
new COLUMNS on old tables (e.g. customers.folder_name) would otherwise be missing and
every query on that table would fail. This only ever ADDS nullable columns; it never
drops or alters anything.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def add_missing_columns(engine: Engine, metadata) -> list:
    added = []
    insp = inspect(engine)
    existing_tables = set(insp.get_table_names())
    with engine.begin() as conn:
        for table in metadata.sorted_tables:
            if table.name not in existing_tables:
                continue  # create_all() handles new tables
            have = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name in have or col.primary_key:
                    continue
                col_type = col.type.compile(dialect=engine.dialect)
                default_sql = ""
                d = col.default
                if d is not None and getattr(d, "is_scalar", False):
                    v = d.arg
                    if isinstance(v, bool):
                        default_sql = f" DEFAULT {'TRUE' if v else 'FALSE'}" if engine.dialect.name != "sqlite" else f" DEFAULT {1 if v else 0}"
                    elif isinstance(v, (int, float)):
                        default_sql = f" DEFAULT {v}"
                    elif isinstance(v, str):
                        default_sql = " DEFAULT '" + v.replace("'", "''") + "'"
                conn.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN "{col.name}" {col_type}{default_sql}'))
                added.append(f"{table.name}.{col.name}")
    return added
