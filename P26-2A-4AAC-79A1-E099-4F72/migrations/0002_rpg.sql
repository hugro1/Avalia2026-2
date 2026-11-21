
-- Projeto #8: Gerenciador de Fichas e Rolagem de Dados para RPG

CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  character_class TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  strength INTEGER NOT NULL DEFAULT 10,
  dexterity INTEGER NOT NULL DEFAULT 10,
  constitution INTEGER NOT NULL DEFAULT 10,
  intelligence INTEGER NOT NULL DEFAULT 10,
  wisdom INTEGER NOT NULL DEFAULT 10,
  charisma INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES discord_users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_characters_user
ON characters(user_id);

CREATE TABLE IF NOT EXISTS dice_rolls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  character_id INTEGER,
  dice_type INTEGER NOT NULL CHECK (dice_type IN (4, 6, 8, 10, 12, 20)),
  result INTEGER NOT NULL,
  attribute TEXT,
  modifier INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES discord_users(user_id),
  FOREIGN KEY (character_id) REFERENCES characters(id)
);

CREATE INDEX IF NOT EXISTS idx_dice_rolls_created
ON dice_rolls(created_at);

CREATE INDEX IF NOT EXISTS idx_dice_rolls_user
ON dice_rolls(user_id);
