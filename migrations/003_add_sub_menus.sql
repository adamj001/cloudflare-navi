-- Add sub menus under each main menu/group.

CREATE TABLE IF NOT EXISTS sub_menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    order_num INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

ALTER TABLE sites ADD COLUMN sub_menu_id INTEGER REFERENCES sub_menus(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sub_menus_group_id ON sub_menus(group_id);
CREATE INDEX IF NOT EXISTS idx_sites_sub_menu_id ON sites(sub_menu_id);
