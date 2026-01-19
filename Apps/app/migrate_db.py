import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("POSTGRES_DB", "magisterka"),
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", "postgres")
        )
        cur = conn.cursor()
        
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='tickets' AND column_name='creator_email'")
        if not cur.fetchone():
            print("Adding creator_email column...")
            cur.execute("ALTER TABLE tickets ADD COLUMN creator_email VARCHAR(150)")
        
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='tickets' AND column_name='creator_name'")
        if not cur.fetchone():
            print("Adding creator_name column...")
            cur.execute("ALTER TABLE tickets ADD COLUMN creator_name VARCHAR(150)")

        conn.commit()
        cur.close()
        conn.close()
        print("Migration complete.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
