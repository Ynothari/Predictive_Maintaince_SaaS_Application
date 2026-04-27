"""Run this once to create the webhook_configs table."""
from app.database import init_db, engine
from sqlalchemy import text, inspect

init_db()
inspector = inspect(engine)
tables = inspector.get_table_names()

if "webhook_configs" not in tables:
    sql = (
        "CREATE TABLE IF NOT EXISTS webhook_configs ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "user_id INTEGER NOT NULL REFERENCES users(id), "
        "url VARCHAR NOT NULL, "
        "secret VARCHAR NOT NULL DEFAULT '', "
        "enabled BOOLEAN NOT NULL DEFAULT 1, "
        "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
        ")"
    )
    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()
    print("Created webhook_configs table")
else:
    print("webhook_configs already exists")

print("All tables:", inspect(engine).get_table_names())
